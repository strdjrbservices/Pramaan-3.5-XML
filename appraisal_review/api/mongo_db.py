import os
import uuid
import logging
from datetime import datetime, timezone
from urllib.parse import quote_plus
import pymongo
from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)

# MongoDB Atlas credentials from D:\Json dump and field validation\connect.py
MONGO_USERNAME = os.environ.get("MONGO_USERNAME", "strdjrbservices_db_user")
MONGO_PASSWORD = os.environ.get("MONGO_PASSWORD", "Strdjrbservices@41$")
MONGO_CLUSTER = os.environ.get("MONGO_CLUSTER", "cluster0.qb6aw8z.mongodb.net")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "Instruction")

MONGO_URI = os.environ.get(
    "MONGO_URI",
    f"mongodb+srv://{MONGO_USERNAME}:{quote_plus(MONGO_PASSWORD)}@{MONGO_CLUSTER}/"
)

_mongo_client = None

def get_mongo_client():
    """
    Returns a singleton MongoClient with robust connection and timeout settings.
    """
    global _mongo_client
    if _mongo_client is None:
        try:
            _mongo_client = pymongo.MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=10000,
                connectTimeoutMS=10000,
                socketTimeoutMS=30000,
                connect=False,
                maxPoolSize=20,
            )
        except Exception as e:
            logger.error(f"Failed to create MongoClient: {e}")
            raise
    return _mongo_client

def get_mongo_db():
    """
    Returns the target database (defaults to 'Instruction').
    """
    client = get_mongo_client()
    return client[MONGO_DB_NAME]

def get_reports_collection():
    return get_mongo_db()["appraisal_reports"]

def get_messages_collection():
    return get_mongo_db()["contact_messages"]

def get_users_collection():
    return get_mongo_db()["users"]


# ---------------------------------------------------------
# Appraisal Reports Operations
# ---------------------------------------------------------

def mongo_save_report(report_data, user_name=None, file_name=None, validation_log=None, status="Completed", report_id=None):
    """
    Saves an appraisal report document into MongoDB.
    Generates a UUID string ID if not provided.
    """
    rid = str(report_id) if report_id else str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    doc = {
        "_id": rid,
        "id": rid,
        "user_name": user_name,
        "file_name": file_name,
        "report_data": report_data,
        "validation_log": validation_log,
        "status": status or "Completed",
        "created_at": now,
        "updated_at": now,
    }
    
    col = get_reports_collection()
    col.replace_one({"_id": rid}, doc, upsert=True)
    return doc


def mongo_get_reports(limit=100):
    """
    Retrieves summary report list for the history / reports table.
    Matches AppraisalReportListSerializer fields:
    ['id', 'user_name', 'file_name', 'report_data', 'created_at', 'status']
    """
    col = get_reports_collection()
    projection = {
        "_id": 1,
        "id": 1,
        "user_name": 1,
        "file_name": 1,
        "status": 1,
        "created_at": 1,
        "report_data.totalTimeTaken": 1,
    }
    
    try:
        cursor = col.find({}, projection).sort("created_at", -1).limit(limit)
        results = []
        for doc in cursor:
            created_at_val = doc.get("created_at")
            if isinstance(created_at_val, datetime):
                created_at_str = created_at_val.isoformat()
            else:
                created_at_str = str(created_at_val) if created_at_val else None

            rep_data = doc.get("report_data") or {}
            total_time = "N/A"
            if isinstance(rep_data, dict):
                total_time = rep_data.get("totalTimeTaken", "N/A")

            results.append({
                "id": str(doc.get("id") or doc.get("_id")),
                "user_name": doc.get("user_name"),
                "file_name": doc.get("file_name"),
                "status": doc.get("status", "Completed"),
                "created_at": created_at_str,
                "report_data": {
                    "totalTimeTaken": total_time
                }
            })
        return results
    except Exception as e:
        logger.error(f"Error fetching reports from MongoDB: {e}")
        return []


def mongo_get_report_by_id(report_id):
    """
    Retrieves the full report by ID (matching _id or id).
    """
    col = get_reports_collection()
    rid = str(report_id)
    doc = col.find_one({"$or": [{"_id": rid}, {"id": rid}]})
    if not doc:
        return None

    created_at_val = doc.get("created_at")
    if isinstance(created_at_val, datetime):
        created_at_str = created_at_val.isoformat()
    else:
        created_at_str = str(created_at_val) if created_at_val else None

    return {
        "id": str(doc.get("id") or doc.get("_id")),
        "user_name": doc.get("user_name"),
        "file_name": doc.get("file_name"),
        "report_data": doc.get("report_data", {}),
        "validation_log": doc.get("validation_log"),
        "created_at": created_at_str,
        "status": doc.get("status", "Completed")
    }


def mongo_delete_report(report_id):
    """
    Deletes report by ID. Returns True if deleted, False otherwise.
    """
    col = get_reports_collection()
    rid = str(report_id)
    res = col.delete_one({"$or": [{"_id": rid}, {"id": rid}]})
    return res.deleted_count > 0


def mongo_update_report(report_id, update_fields):
    """
    Updates status, report_data, and/or validation_log of an existing report.
    """
    col = get_reports_collection()
    rid = str(report_id)
    clean_updates = {}
    for k in ["status", "report_data", "validation_log"]:
        if k in update_fields:
            clean_updates[k] = update_fields[k]
    
    clean_updates["updated_at"] = datetime.now(timezone.utc)
    res = col.update_one({"$or": [{"_id": rid}, {"id": rid}]}, {"$set": clean_updates})
    return res.matched_count > 0


# ---------------------------------------------------------
# Contact Message Operations
# ---------------------------------------------------------

def mongo_save_contact_message(name, email, subject, message, send_copy=False):
    """
    Saves a contact message document into MongoDB.
    """
    mid = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "_id": mid,
        "id": mid,
        "name": name,
        "email": email,
        "subject": subject,
        "message": message,
        "send_copy": bool(send_copy),
        "created_at": now
    }
    col = get_messages_collection()
    col.insert_one(doc)
    return doc


# ---------------------------------------------------------
# Users & Auth Operations
# ---------------------------------------------------------

def mongo_save_user(username, password_hash, email="", is_active=True, is_staff=False, is_superuser=False):
    """
    Saves or updates a user document in MongoDB.
    """
    col = get_users_collection()
    now = datetime.now(timezone.utc)
    update_data = {
        "username": username,
        "password": password_hash,
        "email": email or "",
        "is_active": is_active,
        "is_staff": is_staff,
        "is_superuser": is_superuser,
        "updated_at": now,
    }
    col.update_one(
        {"username": username},
        {"$set": update_data, "$setOnInsert": {"created_at": now}},
        upsert=True
    )
    return update_data


def mongo_get_user(username):
    """
    Retrieves user document by username from MongoDB.
    """
    col = get_users_collection()
    return col.find_one({"username": username})


def mongo_get_all_users():
    """
    Retrieves all user documents from MongoDB.
    """
    col = get_users_collection()
    return list(col.find({}))


def sync_users_from_mongo_to_django():
    """
    Restores / synchronizes all users from MongoDB into local Django SQLite user table.
    Ensures default admin user 'strdjrbservices' exists.
    """
    try:
        from django.contrib.auth import get_user_model
        from django.contrib.auth.hashers import make_password
        User = get_user_model()
        
        # 1. Ensure default admin user is seeded into Mongo if not present
        default_admin_name = os.environ.get("ADMIN_USERNAME", "strdjrbservices")
        default_admin_pass = os.environ.get("ADMIN_PASSWORD", "Admin")
        default_admin_email = os.environ.get("ADMIN_EMAIL", "strdjrbservices@gmail.com")

        existing_admin = mongo_get_user(default_admin_name)
        if not existing_admin:
            logger.info(f"Seeding default admin '{default_admin_name}' into MongoDB...")
            mongo_save_user(
                username=default_admin_name,
                password_hash=make_password(default_admin_pass),
                email=default_admin_email,
                is_active=True,
                is_staff=True,
                is_superuser=True
            )

        # 2. Sync all Mongo users into local Django SQLite
        mongo_users = mongo_get_all_users()
        logger.info(f"Found {len(mongo_users)} user(s) in MongoDB to sync.")
        
        for m_user in mongo_users:
            uname = m_user.get("username")
            if not uname:
                continue
            
            pwd_hash = m_user.get("password")
            email = m_user.get("email", "")
            is_active = m_user.get("is_active", True)
            is_staff = m_user.get("is_staff", False)
            is_superuser = m_user.get("is_superuser", False)

            # Ensure valid password hash format
            if pwd_hash and not pwd_hash.startswith("pbkdf2_") and not pwd_hash.startswith("argon2"):
                pwd_hash = make_password(pwd_hash)

            u, created = User.objects.get_or_create(username=uname)
            u.email = email
            u.password = pwd_hash
            u.is_active = is_active
            u.is_staff = is_staff
            u.is_superuser = is_superuser
            u.save()
            logger.info(f"Synchronized user '{uname}' (active={is_active}, created={created})")

    except Exception as e:
        logger.error(f"Error during sync_users_from_mongo_to_django: {e}")


# ---------------------------------------------------------
# Django Authentication Backend for MongoDB
# ---------------------------------------------------------

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.hashers import check_password, make_password

class MongoAuthBackend(ModelBackend):
    """
    Custom Django Authentication Backend that checks Django SQLite first,
    and falls back to MongoDB Atlas 'users' collection.
    If authenticated via MongoDB, automatically restores user into local SQLite.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None

        from django.contrib.auth import get_user_model
        User = get_user_model()

        # 1. Attempt standard local Django authentication
        user = super().authenticate(request, username=username, password=password, **kwargs)
        if user is not None:
            # Sync user to MongoDB to keep Mongo up to date
            try:
                mongo_save_user(
                    username=user.username,
                    password_hash=user.password,
                    email=user.email,
                    is_active=user.is_active,
                    is_staff=user.is_staff,
                    is_superuser=user.is_superuser
                )
            except Exception:
                pass
            return user

        # 2. Check MongoDB directly
        try:
            m_user = mongo_get_user(username)
            if not m_user:
                return None

            stored_pwd = m_user.get("password")
            if not stored_pwd:
                return None

            # Verify password
            is_valid = False
            if check_password(password, stored_pwd):
                is_valid = True
            elif stored_pwd == password:
                is_valid = True
                stored_pwd = make_password(password)
                mongo_save_user(
                    username=username,
                    password_hash=stored_pwd,
                    email=m_user.get("email", ""),
                    is_active=m_user.get("is_active", True),
                    is_staff=m_user.get("is_staff", False),
                    is_superuser=m_user.get("is_superuser", False)
                )

            if is_valid:
                # Sync into local SQLite
                u, _ = User.objects.get_or_create(username=username)
                u.email = m_user.get("email", "")
                u.password = stored_pwd
                u.is_active = m_user.get("is_active", True)
                u.is_staff = m_user.get("is_staff", False)
                u.is_superuser = m_user.get("is_superuser", False)
                u.save()

                if u.is_active:
                    return u
                else:
                    logger.warning(f"User '{username}' found in MongoDB but is marked inactive.")
                    return None
        except Exception as e:
            logger.error(f"MongoAuthBackend authentication error: {e}")

        return None
