# Floreria Florentina Web App — Final Build

Public catalog + product inquiries + contact form + admin portal.

## Local Run

```bash
cd ~/Downloads
unzip floreria-florentina-final-build.zip
cd floreria-florentina-web-app
npm install
cp .env.example .env
npm start
```

Open:

```text
http://localhost:3000
```

Admin portal:

```text
http://localhost:3000/admin
```

Default admin:

```text
username: admin
password: Flowers1234
```

## GitHub Push

```bash
cd ~/Downloads/floreria-florentina-web-app

git init
git add .
git commit -m "Final Floreria Florentina web app build"
git branch -M main
git remote remove origin
git remote add origin https://github.com/ryanstupart/floreria-temp-catalog.git
git push -f origin main
```

## Render Settings

Use **Web Service**, not Static Site.

```text
Build Command: npm install
Start Command: npm start
```

## Render Environment Variables

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Flowers1234
ADMIN_TOKEN=change-this-to-a-long-random-value
EMAIL_TO=ryanstupart@gmail.com
EMAIL_FROM=Floreria Florentina <contact@floreriaflorentina.com>
RESEND_API_KEY=your_resend_api_key
```

## Notes

- Resend domain is assumed verified.
- For testing, emails are sent to `ryanstupart@gmail.com`.
- Later, change `EMAIL_TO` to the business inbox if needed.
- Inquiries are currently stored in `data/inquiries.json`. For long-term production use, move this to a database or persistent disk.
