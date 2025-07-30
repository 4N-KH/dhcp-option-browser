This project is a full-stack application for managing and analyzing DHCP options. It uses a React frontend and a NestJS backend with a PostgreSQL database, all orchestrated through Docker Compose.

## Getting Started

To run the application locally with Docker, follow these steps

Clone the repository

```bash
git clone https://github.com/4N-KH/dhcp-option-browser.git
cd dhcp-option-browser
```

Copy the example environment files

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

On Mac or Linux use

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Open `backend/.env` in a text editor and insert your personal Infoblox CSP API key

```env
CSP_API_KEY=your_infoblox_api_key
```

All other environment variables can remain as provided unless you need to change them

Start all services with Docker Compose

```bash
docker-compose up --build
```

The first startup may take several minutes as Docker downloads and builds images

Open your browser to access the application

Frontend  
[http://localhost:3000](http://localhost:3000)

Backend  
[http://localhost:3001](http://localhost:3001)

Optional  
pgAdmin  
[http://localhost:8080](http://localhost:8080)

## Stopping the Application

To stop all services, use

```bash
docker-compose down
```

To remove all data including the database, use

```bash
docker-compose down -v
```

## Configuration

All important settings such as API keys and database credentials are managed via environment variables in `.env` files. Use the provided `.env.example` templates and edit as needed
