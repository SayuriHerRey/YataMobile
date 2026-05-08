// src/components/NotificationDrawer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URLS } from '../services/config';

const COLORS = {
    primary: '#630ED4',
    surface: '#F8F9FA',
    onSurface: '#191C1D',
    onSurfaceVariant: '#4A4455',
    onPrimary: '#FFFFFF',
    surfaceContainer: '#EDEEEF',
    surfaceContainerLow: '#F3F4F5',
    surfaceContainerLowest: '#FFFFFF',
    outlineVariant: '#CCC3D8',
    error: '#BA1A1A',
    green: '#16A34A',
    orange: '#F59E0B',
    blue: '#3B82F6',
};

export interface NotificationItem {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    status: string;
    is_read: boolean;
    created_at: string;
    sent_at: string | null;
    extra_data: Record<string, any>;
}

interface Props {
    userId: string;
    unreadCount: number;
    onUnreadChange?: (count: number) => void;
}

function getIconForType(type: string): { name: string; color: string; bg: string } {
    switch (type) {
        case 'order_status':
            return { name: 'silverware-fork-knife', color: COLORS.primary, bg: `${COLORS.primary}18` };
        case 'promo':
            return { name: 'tag-outline', color: COLORS.orange, bg: `${COLORS.orange}18` };
        default:
            return { name: 'bell-outline', color: COLORS.blue, bg: `${COLORS.blue}18` };
    }
}

function formatRelativeTime(dateStr: string): string {
    try {
        const now = new Date();
        const date = new Date(dateStr);
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return 'Ahora mismo';
        if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
        return `Hace ${Math.floor(diff / 86400)} d`;
    } catch {
        return '';
    }
}

async function authHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem('userToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export default function NotificationDrawer({ userId, unreadCount, onUnreadChange }: Props) {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadNotifications = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await fetch(
                `${URLS.NOTIFICATION}/notifications/${userId}?limit=30`,
                { headers: await authHeaders() }
            );
            if (res.ok) {
                const data: NotificationItem[] = await res.json();
                setNotifications(data);
            }
        } catch (e) {
            console.warn('Error cargando notificaciones:', e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const markAllRead = async () => {
        try {
            await fetch(
                `${URLS.NOTIFICATION}/notifications/${userId}/read-all`,
                { method: 'PATCH', headers: await authHeaders() }
            );
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            onUnreadChange?.(0);
        } catch (e) {
            console.warn('Error marcando como leídas:', e);
        }
    };

    const handleOpen = async () => {
        setOpen(true);
        await loadNotifications();
        if (unreadCount > 0) await markAllRead();
    };

    const handleClose = () => setOpen(false);

    return (
        <>
            {/* Botón campana con badge */}
            <TouchableOpacity style={styles.bellButton} onPress={handleOpen} activeOpacity={0.7}>
                <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.onSurface} />
                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Modal bandeja */}
            <Modal
                animationType="slide"
                transparent
                visible={open}
                onRequestClose={handleClose}
                statusBarTranslucent
            >
                <View style={styles.overlay}>
                    <TouchableOpacity style={styles.overlayDismiss} onPress={handleClose} activeOpacity={1} />
                    <View style={styles.sheet}>
                        {/* Handle */}
                        <View style={styles.handle} />

                        {/* Header */}
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.headerTitle}>Notificaciones</Text>
                                {unreadCount > 0 && (
                                    <Text style={styles.headerSub}>{unreadCount} sin leer</Text>
                                )}
                            </View>
                            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                                <MaterialCommunityIcons name="close" size={22} color={COLORS.onSurfaceVariant} />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        {loading ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={styles.loadingText}>Cargando notificaciones...</Text>
                            </View>
                        ) : notifications.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <MaterialCommunityIcons name="bell-sleep-outline" size={56} color={COLORS.outlineVariant} />
                                <Text style={styles.emptyTitle}>Sin notificaciones</Text>
                                <Text style={styles.emptySub}>Aquí aparecerán los avisos sobre tus pedidos</Text>
                            </View>
                        ) : (
                            <ScrollView
                                contentContainerStyle={styles.list}
                                showsVerticalScrollIndicator={false}
                            >
                                {notifications.map((item) => {
                                    const icon = getIconForType(item.type);
                                    return (
                                        <View
                                            key={item.id}
                                            style={[styles.item, !item.is_read && styles.itemUnread]}
                                        >
                                            <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
                                                <MaterialCommunityIcons
                                                    name={icon.name as any}
                                                    size={20}
                                                    color={icon.color}
                                                />
                                            </View>
                                            <View style={styles.itemBody}>
                                                <View style={styles.itemTop}>
                                                    <Text style={styles.itemTitle} numberOfLines={1}>
                                                        {item.title}
                                                    </Text>
                                                    <Text style={styles.itemTime}>
                                                        {formatRelativeTime(item.created_at)}
                                                    </Text>
                                                </View>
                                                <Text style={styles.itemMessage} numberOfLines={2}>
                                                    {item.message}
                                                </Text>
                                                {item.extra_data?.order_number && (
                                                    <View style={styles.orderTag}>
                                                        <MaterialCommunityIcons name="receipt" size={11} color={COLORS.primary} />
                                                        <Text style={styles.orderTagText}>
                                                            Pedido #{item.extra_data.order_number}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            {!item.is_read && <View style={styles.dot} />}
                                        </View>
                                    );
                                })}
                                <View style={{ height: 24 }} />
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    bellButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: COLORS.error,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: COLORS.surface,
    },
    badgeText: {
        color: COLORS.onPrimary,
        fontSize: 10,
        fontWeight: '700',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    overlayDismiss: {
        flex: 1,
    },
    sheet: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.outlineVariant,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceContainer,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.onSurface,
    },
    headerSub: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '500',
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surfaceContainerLow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingBox: {
        paddingVertical: 60,
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: COLORS.onSurfaceVariant,
    },
    emptyBox: {
        paddingVertical: 60,
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.onSurfaceVariant,
    },
    emptySub: {
        fontSize: 13,
        color: COLORS.onSurfaceVariant,
        textAlign: 'center',
        opacity: 0.7,
    },
    list: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        marginBottom: 8,
        backgroundColor: COLORS.surfaceContainerLowest,
        position: 'relative',
    },
    itemUnread: {
        backgroundColor: `${COLORS.primary}08`,
        borderWidth: 1,
        borderColor: `${COLORS.primary}20`,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    itemBody: {
        flex: 1,
        gap: 3,
    },
    itemTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    itemTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.onSurface,
    },
    itemTime: {
        fontSize: 11,
        color: COLORS.onSurfaceVariant,
        opacity: 0.6,
        flexShrink: 0,
    },
    itemMessage: {
        fontSize: 13,
        color: COLORS.onSurfaceVariant,
        lineHeight: 18,
    },
    orderTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    orderTagText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.primary,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
        position: 'absolute',
        top: 14,
        right: 14,
    },
});
