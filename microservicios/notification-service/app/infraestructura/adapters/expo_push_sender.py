"""
INFRAESTRUCTURA - Adaptador Expo Push Notifications
La app móvil usa Expo → usamos la Expo Push API oficial.

⚠️ FIX: La Expo Push API v2 espera el payload como una lista (batch),
         aunque sea un solo mensaje. La respuesta tiene forma:
         {"data": [{"status": "ok", "id": "..."}]}  ← lista, no objeto
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
        # Expo acepta objeto individual O lista; usamos lista para respuesta predecible
        payload = [
            {
                "to": expo_token,
                "title": title,
                "body": message,
                "data": data,
                "sound": "default",
                "priority": "high",
                "channelId": "default",   # necesario en Android Expo SDK 44+
            }
        ]
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    EXPO_PUSH_URL,
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Accept-Encoding": "gzip, deflate",
                    },
                )
                if response.status_code != 200:
                    print(f"❌ Expo HTTP {response.status_code}: {response.text[:200]}")
                    return False

                result = response.json()
                # result["data"] es una lista con un ticket por mensaje
                tickets = result.get("data", [])
                if not tickets:
                    print("❌ Expo devolvió lista de tickets vacía")
                    return False

                ticket = tickets[0]
                if ticket.get("status") == "ok":
                    return True
                else:
                    err = ticket.get("details", {})
                    print(f"❌ Expo ticket error: {ticket.get('message')} | {err}")
                    return False

        except Exception as e:
            print(f"❌ ExpoPushSender excepción: {e}")
            return False
