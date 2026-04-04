import bcrypt
import json

# Generate hash for password "section9"
password = b"section9"
hashed = bcrypt.hashpw(password, bcrypt.gensalt()).decode()
print(hashed)
