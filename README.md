# 📋 Guía completa

## 🔌 PUERTOS DE CADA SERVICIO

| Servicio             | Puerto | Base de datos        |
|----------------------|--------|----------------------|
| order-service        | 8000   | yata_orders          |
| notification-service | 8001   | yata_notifications   |
| product-service      | 8002   | yata_products        |
| payment-service      | 8003   | yata_payments        |
| auth-service         | 8004   | yata_auth            |
| analytics-service    | 8005   | yata_analytics       |

---

## 🚀 PASOS PARA LEVANTAR TODO
### 1. En cada archivo .env cambiar su URL de base de datos, con su usuario.
Las bases de datos se crear autamaticamente al correr cada servicio dentro del entorno(venv)

# Ejemplo para auth-service (repite para cada servicio con su DB)
echo "DATABASE_URL=postgresql://postgres:sayu12345@localhost:5432/yata_(nombreBD)" 
```

# Crea el entorno global de nombre venv
### 2. Instalar dependencias en el entorno global 
```bash
PS C:\Users\herna\Desktop\yataMobile>
pip install -r requirements.txt
```

### 3. Arrancar cada servicio (en terminales separadas)
```cd microservicios/nombreServicio
### Activas el entorno 
 ..\..\venv\Scripts\activate

# Desde cada carpeta de microservicio:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload   # order
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload   # notification
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload   # product  
uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload   # payment  
uvicorn app.main:app --host 0.0.0.0 --port 8004 --reload   # auth
uvicorn app.main:app --host 0.0.0.0 --port 8005 --reload   # analytics
```

### 4. Actualizar la IP en config.ts
En consola Ejecuta el comando ipconfig y pon tu ip de wi-fi 

### 5. Arrancar el frontend
cd yataMobile
npx expo start

### 6. Crear el primer usuario desde Swagger
Crea usuarios desde el swagger , para productos/menu puedes hacerlo desde la vista
