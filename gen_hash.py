import bcrypt
import base64

password = b"section9"
hashed = bcrypt.hashpw(password, bcrypt.gensalt())
encoded = base64.b64encode(hashed).decode()
print(encoded)
