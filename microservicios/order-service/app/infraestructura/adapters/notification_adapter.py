"""
INFRAESTRUCTURA - Adaptador HTTP hacia Notification Service
Implementa el puerto NotificationPort usando httpx.
"""
import httpx
import os
from app.domain.order import OrderStatus
from app.application.ports.order_repository import NotificationPort

# URL del notification-service (mejor configurable para desarrollo local)
NOTIFICATION_SERVICE_URL = os.getenv(
    "NOTIFICATION_SERVICE_URL", 
    "http://localhost:8001"   # Cambia a 'http://notification-service:8001' si usas Docker
)

# Mensajes amigables para el estudiante
STATUS_MESSAGES = {
    OrderStatus.RECIBIDO:       "✅ Tu pedido {order_number} fue recibido correctamente.",
    OrderStatus.EN_PREPARACION: "👨‍🍳 Tu pedido {order_number} está siendo preparado.",
    OrderStatus.LISTO:          "🎉 ¡Tu pedido {order_number} está listo para recoger!",
    OrderStatus.ENTREGADO:      "📦 Tu pedido {order_number} ha sido entregado. ¡Gracias por tu preferencia!",
}


class HttpNotificationAdapter(NotificationPort):
    """
    Envía notificaciones push al Notification Service cuando cambia el estado de un pedido.
    """

    async def notify_order_status_changed(
        self,
        student_id: str,
        order_number: str,
        new_status: OrderStatus,
    ) -> None:
        try:
            # Obtener mensaje según estado
            template = STATUS_MESSAGES.get(
                new_status, 
                f"Tu pedido {order_number} ha cambiado de estado."
            )
            message = template.format(order_number=order_number)

            payload = {
                "user_id": student_id,
                "type": "order_status",
                "title": f"Pedido {order_number}",
                "message": message,
                "data": {
                    "order_number": order_number,
                    "status": new_status.value,
                }
            }

            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(
                    f"{NOTIFICATION_SERVICE_URL}/notifications/send",
                    json=payload,
                )

                if response.status_code in (200, 201):
                    print(f"✅ Notificación enviada: {order_number} → {new_status.value}")
                else:
                    print(f"⚠️ Notification Service respondió con {response.status_code}: {response.text}")

        except Exception as e:
            # No bloquear el flujo del pedido si falla la notificación
            print(f"❌ Error enviando notificación push para {order_number}: {e}")