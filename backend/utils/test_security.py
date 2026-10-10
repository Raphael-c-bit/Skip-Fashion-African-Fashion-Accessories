from utils.security import hash_password, verify_password

password = "Skip Fashion@123"

hashed_password = hash_password(password)

print("Original password:")
print(password)

print("\nHashed password:")
print(hashed_password)

print("\nCorrect password:")
print(verify_password(hashed_password, password))

print("\nWrong password:")
print(verify_password(hashed_password, "WrongPassword123"))