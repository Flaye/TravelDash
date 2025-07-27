# app.py
import os

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import auth, credentials, firestore
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from flask_login import (
    LoginManager,
    UserMixin,
    current_user,
    login_required,
    login_user,
    logout_user,
)

# Charge les variables d'environnement du fichier .env
load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "default_secret_key_if_not_set")

# --- Initialisation Firebase Admin SDK ---
# Assurez-vous que le fichier firebase_admin_sdk_key.json est à la racine de votre projet
try:
    cred = credentials.Certificate("firebase_admin_sdk_key.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase Admin SDK initialisé avec succès.")
except Exception as e:
    print(f"Erreur lors de l'initialisation de Firebase Admin SDK: {e}")
    # Gérer l'erreur, peut-être arrêter l'application ou afficher un message d'erreur
    exit(
        "Impossible d'initialiser Firebase Admin SDK. Vérifiez votre clé de compte de service."
    )

# --- Flask-Login Setup ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"  # La vue vers laquelle rediriger si non authentifié


class User(UserMixin):
    def __init__(self, uid, email):
        self.id = uid
        self.email = email

    @staticmethod
    def get(user_id):
        # Récupère un utilisateur depuis Firestore ou Firebase Auth
        try:
            user_record = auth.get_user(user_id)
            return User(user_record.uid, user_record.email)
        except Exception as e:
            print(f"Erreur lors de la récupération de l'utilisateur {user_id}: {e}")
            return None


@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)


# --- Routes ---


@app.route("/")
@login_required
def index():
    # Redirige vers le tableau de bord si l'utilisateur est connecté
    return redirect(url_for("dashboard"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        try:
            # Tente de se connecter avec Firebase Auth
            # Note: Le SDK Admin ne permet pas de vérifier le mot de passe côté serveur directement.
            # Pour une vraie application, vous utiliseriez le SDK client-side pour la connexion
            # et ensuite vérifieriez le token d'ID côté serveur, ou utiliseriez Firebase Functions.
            # Ici, nous allons simplifier pour la démo: on tente de récupérer l'utilisateur par email.
            # Si l'utilisateur existe, on le considère "connecté" pour Flask-Login.
            # Si le mot de passe est incorrect, Firebase Auth côté client lèverait une erreur.
            # Pour cette démo Flask, nous allons simplement créer ou récupérer l'utilisateur.
            try:
                user_record = auth.get_user_by_email(email)
                print(f"Utilisateur existant: {user_record.uid}")
            except auth.UserNotFoundError:
                user_record = auth.create_user(email=email, password=password)
                print(f"Nouvel utilisateur créé: {user_record.uid}")

            login_user(User(user_record.uid, user_record.email))

            # Assurez-vous que le document utilisateur existe dans Firestore
            user_doc_ref = db.collection("users").document(user_record.uid)
            if not user_doc_ref.get().exists:
                user_doc_ref.set(
                    {"email": user_record.email, "ownedTrips": [], "sharedTrips": []}
                )

            return redirect(url_for("dashboard"))
        except Exception as e:
            error = f"Erreur de connexion/inscription: {e}"
            print(error)
            return render_template("login.html", error=error)

    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))


@app.route("/dashboard")
@login_required
def dashboard():
    # Récupère les voyages de l'utilisateur connecté
    user_id = current_user.id
    user_doc_ref = db.collection("users").document(user_id)
    user_doc = user_doc_ref.get()

    user_trips = []
    current_trip_data = None

    if user_doc.exists:
        owned_trips_ids = user_doc.to_dict().get("ownedTrips", [])
        shared_trips_ids = user_doc.to_dict().get("sharedTrips", [])

        all_trip_ids = list(set(owned_trips_ids + shared_trips_ids))

        # Récupère les noms de tous les voyages pour le sélecteur
        for trip_id in all_trip_ids:
            trip_doc = db.collection("trips").document(trip_id).get()
            if trip_doc.exists:
                user_trips.append(
                    {
                        "id": trip_doc.id,
                        "name": trip_doc.to_dict().get(
                            "name", f"Voyage {trip_doc.id[:5]}..."
                        ),
                    }
                )

        # Charge les données du premier voyage si disponible, ou d'un voyage spécifique si demandé
        selected_trip_id = request.args.get("trip_id")
        if selected_trip_id and selected_trip_id in all_trip_ids:
            current_trip_data = _load_trip_data_from_firestore(selected_trip_id)
        elif all_trip_ids:
            # No default trip loaded on initial dashboard load if no trip_id is specified
            # The frontend will now call renderTripList to show all trips
            pass

    return render_template(
        "dashboard.html",
        user_id=user_id,
        user_trips=user_trips,
        current_trip_data=current_trip_data,
    )


# --- Fonctions utilitaires pour Firestore (côté serveur) ---


def _load_trip_data_from_firestore(trip_id):
    """Charge toutes les données d'un voyage spécifique depuis Firestore."""
    trip_doc_ref = db.collection("trips").document(trip_id)
    trip_doc_snap = trip_doc_ref.get()

    if not trip_doc_snap.exists:
        print(f"Voyage non trouvé: {trip_id}")
        return None

    trip_data = trip_doc_snap.to_dict()
    trip_data["id"] = trip_doc_snap.id  # Ajoute l'ID du document

    # Charge les sous-collections
    subcollections = ["itinerary", "hotels", "transports", "expenses", "mapPoints"]
    for sub_name in subcollections:
        sub_docs = trip_doc_ref.collection(sub_name).stream()
        # Convertit les documents en dictionnaires, en ajoutant l'ID du document
        trip_data[sub_name] = [{"id": doc.id, **doc.to_dict()} for doc in sub_docs]

    return trip_data


# --- API Endpoints ---


@app.route("/api/trips", methods=["POST"])
@login_required
def create_trip():
    data = request.json
    user_id = current_user.id

    try:
        # Crée le document de voyage principal
        new_trip_ref = db.collection("trips").add(
            {
                "name": data.get("name", "Nouveau Voyage"),
                "startDate": data.get("startDate", ""),
                "endDate": data.get("endDate", ""),
                "description": data.get("description", ""),
                "totalBudget": float(data.get("totalBudget", 0)),
                "ownerId": user_id,
                "sharedWith": [],
            }
        )
        new_trip_id = new_trip_ref[
            1
        ].id  # new_trip_ref est un tuple (timestamp, doc_ref)

        # Met à jour le document utilisateur pour inclure le nouveau voyage
        user_doc_ref = db.collection("users").document(user_id)
        user_doc_ref.update({"ownedTrips": firestore.ArrayUnion([new_trip_id])})

        return (
            jsonify({"message": "Voyage créé avec succès", "tripId": new_trip_id}),
            201,
        )
    except Exception as e:
        print(f"Erreur lors de la création du voyage: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/trips/<trip_id>/all_data", methods=["GET"])
@login_required
def get_all_trip_data(trip_id):
    """API endpoint to get all data for a specific trip."""
    # Vérifie les permissions d'accès au voyage
    trip_doc = db.collection("trips").document(trip_id).get()
    if not trip_doc.exists:
        return jsonify({"error": "Voyage non trouvé"}), 404

    trip_data = trip_doc.to_dict()
    if current_user.id != trip_data.get(
        "ownerId"
    ) and current_user.id not in trip_data.get("sharedWith", []):
        return jsonify({"error": "Accès non autorisé à ce voyage"}), 403

    full_trip_data = _load_trip_data_from_firestore(trip_id)
    if full_trip_data:
        return jsonify(full_trip_data), 200
    else:
        return jsonify({"error": "Impossible de charger les données du voyage"}), 500


@app.route("/api/trips/<trip_id>/<collection_name>", methods=["GET"])
@login_required
def get_subcollection(trip_id, collection_name):
    # Vérifie les permissions d'accès au voyage (simplifié ici, devrait être plus robuste avec les règles Firestore)
    trip_doc = db.collection("trips").document(trip_id).get()
    if not trip_doc.exists:
        return jsonify({"error": "Voyage non trouvé"}), 404

    # Assurez-vous que l'utilisateur a accès au voyage (via ownerId ou sharedWith)
    trip_data = trip_doc.to_dict()
    if current_user.id != trip_data.get(
        "ownerId"
    ) and current_user.id not in trip_data.get("sharedWith", []):
        return jsonify({"error": "Accès non autorisé à ce voyage"}), 403

    try:
        docs = (
            db.collection("trips")
            .document(trip_id)
            .collection(collection_name)
            .stream()
        )
        items = [{"id": doc.id, **doc.to_dict()} for doc in docs]
        return jsonify(items), 200
    except Exception as e:
        print(
            f"Erreur lors de la récupération de la sous-collection {collection_name}: {e}"
        )
        return jsonify({"error": str(e)}), 500


@app.route("/api/trips/<trip_id>/<collection_name>", methods=["POST"])
@login_required
def add_item_to_subcollection(trip_id, collection_name):
    data = request.json

    # Vérifie les permissions d'écriture (seul le propriétaire peut écrire pour l'instant)
    trip_doc = db.collection("trips").document(trip_id).get()
    if not trip_doc.exists or trip_doc.to_dict().get("ownerId") != current_user.id:
        return jsonify({"error": "Accès non autorisé ou voyage non trouvé"}), 403

    try:
        new_item_ref = (
            db.collection("trips")
            .document(trip_id)
            .collection(collection_name)
            .add(data)
        )
        return jsonify({"message": "Élément ajouté", "id": new_item_ref[1].id}), 201
    except Exception as e:
        print(f"Erreur lors de l'ajout à la sous-collection {collection_name}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/trips/<trip_id>/<collection_name>/<item_id>", methods=["PUT"])
@login_required
def update_item_in_subcollection(trip_id, collection_name, item_id):
    data = request.json

    # Vérifie les permissions d'écriture
    trip_doc = db.collection("trips").document(trip_id).get()
    if not trip_doc.exists or trip_doc.to_dict().get("ownerId") != current_user.id:
        return jsonify({"error": "Accès non autorisé ou voyage non trouvé"}), 403

    try:
        db.collection("trips").document(trip_id).collection(collection_name).document(
            item_id
        ).update(data)
        return jsonify({"message": "Élément mis à jour"}), 200
    except Exception as e:
        print(
            f"Erreur lors de la mise à jour de l'élément {item_id} dans {collection_name}: {e}"
        )
        return jsonify({"error": str(e)}), 500


@app.route("/api/trips/<trip_id>/<collection_name>/<item_id>", methods=["DELETE"])
@login_required
def delete_item_from_subcollection(trip_id, collection_name, item_id):
    # Vérifie les permissions d'écriture
    trip_doc = db.collection("trips").document(trip_id).get()
    if not trip_doc.exists or trip_doc.to_dict().get("ownerId") != current_user.id:
        return jsonify({"error": "Accès non autorisé ou voyage non trouvé"}), 403

    try:
        db.collection("trips").document(trip_id).collection(collection_name).document(
            item_id
        ).delete()
        return jsonify({"message": "Élément supprimé"}), 200
    except Exception as e:
        print(
            f"Erreur lors de la suppression de l'élément {item_id} dans {collection_name}: {e}"
        )
        return jsonify({"error": str(e)}), 500


@app.route("/api/user_trips_summary", methods=["GET"])
@login_required
def get_user_trips_summary():
    user_id = current_user.id
    user_doc_ref = db.collection("users").document(user_id)
    user_doc = user_doc_ref.get()

    trips_summary = []
    if user_doc.exists:
        owned_trips_ids = user_doc.to_dict().get("ownedTrips", [])
        shared_trips_ids = user_doc.to_dict().get("sharedTrips", [])
        all_trip_ids = list(set(owned_trips_ids + shared_trips_ids))

        for trip_id in all_trip_ids:
            trip_doc = db.collection("trips").document(trip_id).get()
            if trip_doc.exists:
                trip_data = trip_doc.to_dict()

                # Calculate total expenses from subcollections for summary
                total_calculated_cost = 0

                expenses_docs = (
                    db.collection("trips")
                    .document(trip_id)
                    .collection("expenses")
                    .stream()
                )
                for doc in expenses_docs:
                    total_calculated_cost += float(doc.to_dict().get("amount", 0))

                hotels_docs = (
                    db.collection("trips")
                    .document(trip_id)
                    .collection("hotels")
                    .stream()
                )
                for doc in hotels_docs:
                    total_calculated_cost += float(doc.to_dict().get("totalPrice", 0))

                transports_docs = (
                    db.collection("trips")
                    .document(trip_id)
                    .collection("transports")
                    .stream()
                )
                for doc in transports_docs:
                    if doc.to_dict().get("type") == "Voiture":
                        total_calculated_cost += float(
                            doc.to_dict().get("estimationCarburant", 0)
                        ) + float(doc.to_dict().get("estimationPeage", 0))
                    else:
                        total_calculated_cost += float(doc.to_dict().get("price", 0))

                trips_summary.append(
                    {
                        "id": trip_doc.id,
                        "name": trip_data.get("name", "Voyage sans nom"),
                        "startDate": trip_data.get("startDate", "N/A"),
                        "endDate": trip_data.get("endDate", "N/A"),
                        "totalBudget": trip_data.get("totalBudget", 0),
                        "totalCalculatedCost": total_calculated_cost,
                    }
                )
    return jsonify(trips_summary), 200


if __name__ == "__main__":
    app.run(debug=True)  # debug=True pour le développement, à désactiver en production
