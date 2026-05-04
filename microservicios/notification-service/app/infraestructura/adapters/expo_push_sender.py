"""
INFRAESTRUCTURA - Adaptador Expo Push Notifications
La app móvil usa Expo → usamos la Expo Push API oficial.
"""
import httpx
from app.application.ports.noti_repository import PushSenderPort

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class ExpoPushSender(PushSenderPort):
    """
    Envía notificaciones push a dispositivos Expo.
    Formato de token esperado: ExponentPushToken[xxxxxxx]
    """

    async def send(
        self,
        expo_token: str,
        title: str,
        message: str,
        data: dict,
    ) -> bool:
        payload = {
            "to": expo_token,
            "title": title,
            "body": message,
            "data": data,
            "sound": "default",
            "priority": "high",
            # Badge se puede calcular dinámicamente si se desea
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    EXPO_PUSH_URL,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                result = response.json()
                # La API de Expo retorna {"data": {"status": "ok"}} si fue exitoso
                return (
                    response.status_code == 200
                    and result.get("data", {}).get("status") == "ok"
                )
        except Exception:
            return False
