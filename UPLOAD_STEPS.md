# How to Upload This Project to GitHub

I have already secured your project by:
1.  Creating a `.gitignore` file to exclude sensitive files (keys, secrets, python cache, node_modules).
2.  Creating `.env.example` files in both `frontend` and `backend` folders to show which variables are needed without exposing values.

## Steps to Upload

### 1. Clean up nested git repository (Recommended)
Since the `frontend` folder was previously initialized as a git repository, you should remove its internal git tracking to upload the entire project as one repository.

Run this in your terminal (PowerShell):
```powershell
Remove-Item -Recurse -Force "c:\Users\zeusm\Downloads\Test project\frontend\.git"
```

### 2. Initialize the Project Repository
Run these commands in the root folder (`c:\Users\zeusm\Downloads\Test project`):

```bash
# Initialize git
git init

# Add all files (this respects the .gitignore I created)
git add .

# Commit the files
git commit -m "Initial commit"
```

### 3. Push to GitHub
1.  Go to [GitHub.com](https://github.com) and create a new **public** repository.
2.  Do **not** add a README, .gitignore, or license (we already have them).
3.  Copy the commands under "…or push an existing repository from the command line".
4.  Run them in your terminal:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Security Note
The following files are now **Ignored** and will NOT be uploaded:
- `backend/serviceAccountKey.json` (Contains your private Firebase Admin key)
- `backend/.env` (Contains the path to the key)
- `frontend/.env.local` (Contains your public Firebase keys - accepted practice, but you asked to hide them, so they are ignored. Users can use `.env.example` to set up their own).
- `node_modules` and `__pycache__` folders.
