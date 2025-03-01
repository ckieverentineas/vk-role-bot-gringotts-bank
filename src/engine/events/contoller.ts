import { KeyboardBuilder } from "vk-io"
import prisma from "./module/prisma_client"
import { root, vk } from "../.."
import { Image_Random } from "../core/imagecpu";
import { User } from "@prisma/client";
import { image_bank } from "../data_center/system_image";
import { Send_Message_Universal } from "../core/helper";

function Sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export async function Main_Menu_Init(context: any) {
    const attached = image_bank//await Image_Random(context, "bank")
    const user: User | null = await prisma.user.findFirst({ where: { idvk: context.peerId } })
    const text = `🏦 Доступ разрешен, зашифрованное соединение по proxy: https:/hog_online/bank_gringotts/${user?.id}:${user?.idvk}\n✅ Вы авторизованы, ${user?.name}!\n💳 UID-${user?.id} Баланс: ${user?.gold}💰 ${user?.xp}🧙`
    await Send_Message_Universal(context.peerId, text, await Main_Menu(context), attached)
    //await vk.api.messages.edit({peer_id: context.peerId, conversation_message_id: context.conversationMessageId, message: `🏦 Доступ разрешен, зашифрованное соединение по proxy: https:/hog_online/bank_gringotts/${user?.id}:${user?.idvk}\n✅ Вы авторизованы, ${user?.name}!\n💳 UID-${user?.id} Баланс: ${user?.gold}💰 ${user?.xp}🧙`, keyboard: await Main_Menu(context), attachment: attached.toString() })
    await vk.api.messages.sendMessageEventAnswer({
        event_id: context.eventId,
        user_id: context.userId,
        peer_id: context.peerId,
        event_data: JSON.stringify({
            type: "show_snackbar",
            text: "🔔 Новое сообщение: Где деньги, Лебовски?"
        })
    })
}
export async function Exit(context: any) {
    await vk.api.messages.edit({peer_id: context.peerId, conversation_message_id: context.conversationMessageId, message: `💡 Сессия успешно завершена. Чтобы начать новую, напишите [!банк] без квадратных скобочек`})
    await vk.api.messages.sendMessageEventAnswer({
        event_id: context.eventId,
        user_id: context.userId,
        peer_id: context.peerId,
        event_data: JSON.stringify({
            type: "show_snackbar",
            text: "🔔 Выход из системы успешно завершен!"
        })
    })
}
export async function Main_Menu(context: any) {
    const user_check: any = await prisma.user.findFirst({ where: { idvk: context.peerId } })
    const keyboard = new KeyboardBuilder()
    .callbackButton({ label: 'Карта', payload: { command: 'card_enter' }, color: 'secondary' })
    .callbackButton({ label: 'Инвентарь', payload: { command: 'inventory_enter' }, color: 'secondary' }).row()
    .callbackButton({ label: 'Артефакты', payload: { command: 'artefact_enter' }, color: 'secondary' })
    .callbackButton({ label: 'Косой переулок', payload: { command: 'shop_category_enter' }, color: 'positive' }).row()
    .callbackButton({ label: 'Услуги', payload: { command: 'service_enter' }, color: 'primary' })
    .callbackButton({ label: 'Хранилище', payload: { command: 'storage_enter' }, color: 'secondary' }).row()
    if (user_check.id_role === 2) {
        keyboard.callbackButton({ label: 'Админы', payload: { command: 'admin_enter' }, color: 'secondary' })
    }
    keyboard.callbackButton({ label: '🚫', payload: { command: 'exit' }, color: 'secondary' }).oneTime().inline()
    return keyboard
}
