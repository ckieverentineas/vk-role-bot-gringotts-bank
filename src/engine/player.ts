import { PrismaClient } from "@prisma/client";
import { HearManager } from "@vk-io/hear";
import { randomInt } from "crypto";
import { send } from "process";
import { Attachment, Context, Keyboard, KeyboardBuilder, PhotoAttachment } from "vk-io";
import { IQuestionMessageContext } from "vk-io-question";
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { chat_id, prisma, root, vk } from '../index';
import { Accessed, Gen_Inline_Button_Category, Gen_Inline_Button_Item, Keyboard_Index } from "./core/helper";
import { readFile, writeFile, mkdir } from 'fs/promises';
import { Image_Composer, Image_Composer2, Image_Interface, Image_Text_Add } from "./core/imagecpu";

export function registerUserRoutes(hearManager: HearManager<IQuestionMessageContext>): void {
    hearManager.hear(/карта/, async (context) => {
        const get_user:any = await prisma.user.findFirst({ where: { idvk: context.senderId } })
        
        await Image_Text_Add(context, './src/art/card.jpg', 50, 650, get_user)
        //await Image_Composer2()
        //await Image_Interface([{ name: 'Серый кот', price: '10G'}, { name: 'Метла', price: '7G'}, { name: 'Стандартный набор учебников', price: '30G'}], context)
        const artefact_counter = await prisma.artefact.count({ where: { id_user: get_user.id } })
        context.send(`✉ Вы достали свою карточку, ${get_user.class} ${get_user.name}, ${get_user.spec}:\n 💳UID: ${get_user.id} \n 💰Галлеоны: ${get_user.gold} \n 🧙Магический опыт: ${get_user.xp} \n 📈Уровень: ${get_user.lvl} \n 🔮Количество артефактов: ${artefact_counter} `)
        console.log(`User ${get_user.idvk} see card`)
        const user_list: any = await prisma.user.findMany({})
        const rana = randomInt(0, user_list.length)
        let ii = `🔔 А вы знали, что @id${user_list[rana].idvk}(${user_list[rana].name}) `
        if (randomInt(0,2) == 0) {
            if (get_user.gold > user_list[rana].gold) { ii += `беднее вас в ${(get_user.gold/user_list[rana].gold).toFixed(2)} раз?` }
            else if (get_user.gold < user_list[rana].gold) { ii += `богаче вас в ${(user_list[rana].gold/get_user.gold).toFixed(2)} раз?` }
            else { ii = '💡 Вы взгляную на свою банковскую карту, что дальше?' }
        } else {
            if (get_user.lvl > user_list[rana].lvl) { ii += `отстает на ${get_user.lvl -user_list[rana].lvl} уровней от вас?` }
            else if (get_user.lvl < user_list[rana].lvl) { ii += `имеет на ${user_list[rana].lvl - get_user.lvl} уровней больше, чем вы?` }
            else { ii = '💡 Ваше отражение промелькнуло невзначай, что дальше?' }
        }
        await Keyboard_Index(context, `${ii}`)
    })
    hearManager.hear(/артефакты/, async (context) => {
        const get_user: any = await prisma.user.findFirst({ where: { idvk: context.senderId } })
        await context.send({ attachment: await vk.upload.messagePhoto({ source: { value: './src/art/artefact.jpg' } }) });
        context.send(`✉ Ваши артефакты, ${get_user.class} ${get_user.name}, ${get_user.spec}: `)
        const artefact = await prisma.artefact.findMany({ where: { id_user: get_user.id } })
        if (artefact.length > 0) {
            let artefact_list: String = ''
            for (const i in artefact) { artefact_list += `💬: ${artefact[i].name} \n 🔧: ${artefact[i].type}${artefact[i].label} \n 🧷:  ${artefact[i].description}` }
            context.send(`${artefact_list}`)
        } else { context.send(`✉ У Вас еще нет артефактов =(`) }
        console.log(`User ${get_user.idvk} see artefacts`)
        const artefact_list: any = await prisma.artefact.findMany({include: { user: true }})
        if (artefact_list.length > 0) {
            const seler = randomInt(0, artefact_list.length)
            let ii = `🔔 А вы знали, что @id${artefact_list[seler].user.idvk}(${artefact_list[seler].user.name}) `
            let trig = false
            for (const i in artefact) { 
                if (artefact[i].description == artefact_list[seler].description) { 
                    ii += `всеравно не победит вас своим 🔮${artefact_list[seler].name}!`
                    trig = true
                    break
                } 
            }
            if (!trig) {
                ii += `уже имеет в наличии 🔮${artefact_list[seler].name}!`
            }
            await Keyboard_Index(context, `${ii}`)
        } else { await Keyboard_Index(context, `💡 Может быть вам скоро тоже дадут артефакт?`)}
    })
    hearManager.hear(/Косой переулок/, async (context) => {
        if (context.senderId == root) {
            console.log(`Admin ${context.senderId} enter in shopping`)
            const category:any = await prisma.category.findMany({})
            if (category.length == 0) {
                const ans: any = await context.question(
                    `✉ Магазинов еще нет`,
                    {   keyboard: Keyboard.builder()
                        .textButton({   label: 'Добавить магазин',
                                        payload: {  command: 'new_shop' },
                                        color: 'secondary'                  })
                        .oneTime().inline()                                     }
                )
                if (ans.payload.command == 'new_shop') {
                    const shop: any = await context.question(`🧷 Введите название магазина:`)
                    const shop_create = await prisma.category.create({  data: { name: shop.text }   })
                    console.log(`User ${context.senderId} open new shop`)
                    await vk.api.messages.send({
                        peer_id: chat_id,
                        random_id: 0,
                        message: `⚙ @id${context.senderId}(ROOT) пользователь открывает следующий магазин ${shop_create.name}`
                    })
                    context.send(`⚙ Вы открыли следующий магазин ${shop_create.name}`)
                }
            } else {
                let keyboard = Keyboard.builder()
                category.forEach(async (element: any) => {
                    keyboard.textButton({   label: element.name,
                                            payload: { command: `${element.id}` }   })
                    .textButton({   label: "Удалить",
                                    payload: { command: `${element.id}` }   }).row()
                })
                const ans: any = await context.question(`✉ Куда пойдем?`,
                    {   keyboard: keyboard
                        .textButton({   label: 'Добавить магазин',
                                        payload: { command: 'new_shop' },
                                        color: 'secondary'                  })
                        .oneTime().inline()                                     })
                if (ans.text == "Удалить") {
                    const shop_delete = await prisma.category.delete({ where: { id: Number(ans.payload.command) } })
                    console.log(`User ${context.senderId} close shop`)
                    await vk.api.messages.send({
                        peer_id: chat_id,
                        random_id: 0,
                        message: `⚙ @id${context.senderId}(ROOT) пользователь закрывает следующий магазин ${shop_delete.name}`
                    })
                    context.send(`⚙ Удален магазин ${shop_delete.name}`)
                }
                if (ans.payload?.command == 'new_shop') {
                    const shop: any = await context.question( `🧷 Введите название магазина:` )
                    const shop_create: any = await prisma.category.create({ data: { name: shop.text } })
                    console.log(`User ${context.senderId} open new shop`)
                    context.send(`⚙ Вы открыли следующий магазин ${shop_create.name}`)
                    await vk.api.messages.send({
                        peer_id: chat_id,
                        random_id: 0,
                        message: `⚙ @id${context.senderId}(ROOT) пользователь открыл следующий магазин ${shop_create.name}`
                    })
                }
                if (category.find((i: any) => i.name == ans.text)) {
                    context.send(`⌛ Вы оказались в ${ans.text}`)
                    const item: any= await prisma.item.findMany({ where: { id_category: Number(ans.payload.command) } })
                    if (item.length == 0) {
                        context.send(`✉ К сожалению приалвки пока что пусты=/`)
                    } else {
                        item.forEach(async (element: any) => {
                            const buer: any= context.send(`🛍 ${element.name} ${element.price}💰`,
                                {   keyboard: Keyboard.builder()
                                    .textButton({   label: 'Купить',
                                                    payload: { command: `${element.name}` },
                                                    color: 'secondary'                        })
                                    .textButton({   label: '✏Имя',
                                                    payload: { command: `${element.name}` },
                                                    color: 'secondary'                        })
                                    .textButton({   label: '✏Тип',
                                                    payload: { command: `${element.name}` },
                                                    color: 'secondary'                        })
                                    .oneTime().inline()                                             })  })
                    }
                    const ans_item: any = await context.question( `✉ Что будем делать?`,
                        {   keyboard: Keyboard.builder()
                            .textButton({   label: 'Добавить товар',
                                            payload: { command: 'new_item' },
                                            color: 'secondary'                  })
                            .textButton({   label: 'Перейти к покупкам',
                                            payload: { command: 'continue' },
                                            color: 'secondary'                  })
                            .oneTime().inline()                                     }
                    )
                    if (ans_item.payload?.command == 'new_item') {
                        const item_name: any = await context.question( `🧷 Введите название предмета:` )
                        const item_price = await context.question( `🧷 Введите его ценность:` )
                        const item_type: any = await context.question( `🧷 Укажите тип товара: \n 🕐 — покупается пользователем однажды; \n ♾ — покупается пользователем бесконечное количество раз.`,
                            {   keyboard: Keyboard.builder()
                                .textButton({   label: '🕐',
                                                payload: { command: 'limited' },
                                                color: 'secondary'                  })
                                .textButton({   label: '♾',
                                                payload: { command: 'unlimited' },
                                                color: 'secondary'                  })
                                .oneTime().inline()                                     }
                        )
                        const item_create = await prisma.item.create({ data: {  name: item_name.text, price: Number(item_price.text), id_category: Number(ans.payload.command), type: item_type.payload.command } })
                        console.log(`User ${context.senderId} added new item ${item_create.id}`)
                        context.send(`⚙ Для магазина ${ans.text} добавлен новый товар ${item_name.text} стоимостью ${item_price.text} галлеонов`)
                        await vk.api.messages.send({
                            peer_id: chat_id,
                            random_id: 0,
                            message: `⚙ @id${context.senderId}(ROOT) пользователь добавляет новый товар ${item_name.text} стоимостью ${item_price.text} галлеонов`
                        })
                    }
                    if (ans_item.payload.command == 'continue') { context.send(`💡 Нажимайте кнопку купить у желаемого товара`) }
                }
            }
        } else {
            console.log(`User ${context.senderId} enter in shopping`)
            const categorys:any = await prisma.category.findMany({})
            if (categorys.length == 0) {
                const ans: any = await context.send(`✉ Магазинов еще нет`)
                return
            } 
            let cat_stop = false
            while (cat_stop == false) {
                const category = await prisma.category.findMany({})
                const skill = await  Gen_Inline_Button_Category(context, category, 'Куда пойдем?')
                if (!skill) {cat_stop = true} else {
                    const skill_sel = await Gen_Inline_Button_Item(skill, context)
                    if (skill_sel) {cat_stop = true}
                }
            }
        }
        await Keyboard_Index(context, `💡 А может быть в косом переулке есть подполье?`)
    })
    hearManager.hear(/✏Тип/, async (context) => {
        if (context.messagePayload == null && context.senderId != root) {
            console.log((`stop`))
            return
        }
        const item_buy:any = await prisma.item.findFirst({
            where: {
                name: context.messagePayload.command,
            }
        })
        if (item_buy) {
            const item_type: any = await context.question( `🧷 Укажите тип товара для ${item_buy.name}: \n 🕐 — покупается пользователем однажды; \n ♾ — покупается пользователем бесконечное количество раз. \n Текущий тип: ${item_buy.type}`,
                {   keyboard: Keyboard.builder()
                    .textButton({ label: '🕐', payload: { command: 'limited' }, color: 'secondary' })
                    .textButton({ label: '♾', payload: { command: 'unlimited' }, color: 'secondary' })
                    .oneTime().inline()                                                                 }
            )
            const item_update = await prisma.item.update({ where: { id: item_buy.id }, data: { type: item_type.payload.command } })
            console.log(`Admin ${context.senderId} edit type item ${item_buy.id}`)
            context.send(`⚙ Тип предмета ${item_buy.name} изменен с ${item_buy.type} на ${item_update.type}`)
            await vk.api.messages.send({
                peer_id: chat_id,
                random_id: 0,
                message: `⚙ @id${context.senderId}(ROOT) пользователь корректирует тип предмета ${item_buy.name} с ${item_buy.type} на ${item_update.type}`
            })
        } else {
            console.log(`Admin ${context.senderId} can't edit type item ${item_buy.id}`)
            context.send(`✉ Тип предмета не удалось поменять`)
        }
        await Keyboard_Index(context, `💡 Вот бы всегда безлимит, и редактировать бы ничего не пришлось?`)
    })
    hearManager.hear(/✏Имя/, async (context) => {
        if (context.messagePayload == null && context.senderId != root) {
            console.log((`stop`))
            return
        }
        const item_buy:any = await prisma.item.findFirst({ where: { name: context.messagePayload.command } })
        if (item_buy) {
            const name: any = await context.question(`🧷 Предмет: ${item_buy.name}.\nВведите новое имя для товара:`)
            const item_update = await prisma.item.update({ where: { id: item_buy.id }, data: { name: name.text } })
            console.log(`Admin ${context.senderId} edit name item ${item_buy.id}`)
            context.send(`⚙ Имя предмета ${item_buy.name} изменено на ${item_update.name}`)
            await vk.api.messages.send({
                peer_id: chat_id,
                random_id: 0,
                message: `⚙ @id${context.senderId}(ROOT) пользователь корректирует имя предмета с ${item_buy.name} на ${item_update.name}`
            })
        } else {
            console.log(`Admin ${context.senderId} can't edit name item ${item_buy.id}`)
            context.send(`✉ Имя предмета не удалось поменять`)
        }
        await Keyboard_Index(context, `💡 Может еще что-нибудь отредактировать?`)
    })
    hearManager.hear(/операции/, async (context) => {
        if (await Accessed(context) != 2) {
            return
        }
        let name_check = false
		let datas: any = []
		while (name_check == false) {
			const uid: any = await context.question( `🧷 Введите 💳UID банковского счета получателя:` )
			if (/^(0|-?[1-9]\d{0,5})$/.test(uid.text)) {
                const get_user = await prisma.user.findFirst({
                    where: {
                        id: Number(uid.text)
                    }
                })
                if (get_user) {
                    console.log(`Admin ${context.senderId} opened ${get_user.idvk} card UID: ${get_user.id}`)
                    name_check = true
				    datas.push({id: `${uid.text}`})
                    const artefact_counter = await prisma.artefact.count({
                        where: {
                            id_user: Number(uid.text)
                        }
                    })
                    context.send(`🏦 Открыта следующая карточка: ${get_user.class} ${get_user.name}, ${get_user.spec}: \n https://vk.com/id${get_user.idvk} \n 💳UID: ${get_user.id} \n 💰Галлеоны: ${get_user.gold} \n 🧙Магический опыт: ${get_user.xp} \n 📈Уровень: ${get_user.lvl} \n 🔮Количество артефактов: ${artefact_counter}` )
                    const inventory = await prisma.inventory.findMany({ where: { id_user: get_user?.id } })
                    let cart = ''
                    const underwear = await prisma.trigger.count({ where: {    id_user: get_user.id, name:   'underwear', value:  false } })
                    if (underwear) { cart = '👜 Трусы Домашние;' }
                    if (inventory.length == 0) {
                        context.send(`✉ Покупки пока не совершались`)
                    } else {
                        for (let i = 0; i < inventory.length; i++) {
                            const element = inventory[i].id_item;
                            const item = await prisma.item.findFirst({ where: { id: element } })
                            cart += `👜 ${item?.name};`
                        }
                        const destructor = cart.split(';').filter(i => i)
                        let compile = []
                        for (let i = 0; i < destructor.length; i++) {
                            let counter = 0
                            for (let j = 0; j < destructor.length; j++) {
                                if (destructor[i] != null) {
                                    if (destructor[i] == destructor[j]) {
                                        counter++
                                    }
                                }
                            }
                            compile.push(`${destructor[i]} x ${counter}\n`)
                            counter = 0
                        }
                        let final: any = Array.from(new Set(compile));
                        context.send(`✉ Были совершены следующие покупки:: \n ${final.toString().replace(/,/g, '')}`)
                    }
                } else { context.send(`💡 Нет такого банковского счета!`) }
			} else {
				context.send(`💡 Необходимо ввести корректный UID!`)
			}
		}

        const ans: any = await context.question( `✉ Доступны следующие операции с 💳UID: ${datas[0].id}`,
            {   keyboard: Keyboard.builder()
                .textButton({ label: '+💰', payload: { command: 'gold_up' }, color: 'secondary' })
                .textButton({ label: '—💰', payload: { command: 'gold_down' }, color: 'secondary' }).row()
                .textButton({ label: '+🧙', payload: { command: 'xp_up' }, color: 'secondary' })
                .textButton({ label: '—🧙', payload: { command: 'xp_down' }, color: 'secondary' }).row()
                .textButton({ label: '➕🔮', payload: { command: 'artefact_add' }, color: 'secondary' })
                .textButton({ label: '👁🔮', payload: { command: 'artefact_show' }, color: 'secondary' }).row()
                .textButton({ label: '✏', payload: { command: 'editor' }, color: 'secondary' })
                .textButton({ label: '🔙', payload: { command: 'back' }, color: 'secondary' })
                .textButton({ label: '☠', payload: { command: 'user_delete' }, color: 'secondary' })
                .oneTime().inline()                                                                             }
        )
        async function Gold_Up(id: number) {
            const count: number = await Ipnut_Gold() 
            const messa: string = await Ipnut_Message()
            const user_get: any = await prisma.user.findFirst({ where: { id } })
            const money_put = await prisma.user.update({ where: { id: user_get.id }, data: { gold: user_get.gold + count } })
            try {
                await vk.api.messages.send({
                    user_id: user_get.idvk,
                    random_id: 0,
                    message: `⚙ Вам начислено ${count}💰. \nВаш счёт: ${money_put.gold}💰 \n Уведомление: ${messa}`
                })
                context.send(`⚙ Операция завершена успешно`)
            } catch (error) {
                console.log(`User ${user_get.idvk} blocked chating with bank`)
            }
            await vk.api.messages.send({
                peer_id: chat_id,
                random_id: 0,
                message: `⚙ @id${context.senderId}(Admin) > "+💰" > ${money_put.gold-count}💰+${count}💰=${money_put.gold}💰 для @id${user_get.idvk}(${user_get.name}) 🧷: ${messa}`
            })
            console.log(`User ${user_get.idvk} got ${count} gold. Him/Her bank now ${money_put.gold}`)
        }
        async function Gold_Down(id: number) {
            const count: number = await Ipnut_Gold() 
            const messa: string = await Ipnut_Message()
            const user_get: any = await prisma.user.findFirst({
                where: {
                    id
                }
            })
            if (user_get.gold-count >= 0) {
                const money_put = await prisma.user.update({
                    where: {
                        id: user_get.id
                    },
                    data: {
                        gold: user_get.gold - count
                    }
                })
                try {
                    await vk.api.messages.send({
                        user_id: user_get.idvk,
                        random_id: 0,
                        message: `⚙ С вас снято ${count}💰. \nВаш счёт: ${money_put.gold}💰 \n Уведомление: ${messa}`
                    })
                    context.send(`⚙ Операция завершена успешно`)
                } catch (error) {
                    console.log(`User ${user_get.idvk} blocked chating with bank`)
                }
                await vk.api.messages.send({
                    peer_id: chat_id,
                    random_id: 0,
                    message: `⚙ @id${context.senderId}(Admin) > "-💰" > ${money_put.gold+count}💰-${count}💰=${money_put.gold}💰 для @id${user_get.idvk}(${user_get.name}) 🧷: ${messa}`
                })
                console.log(`User ${user_get.idvk} lost ${count} gold. Him/Her bank now ${money_put.gold}`)
            } else {
                const confirmq = await context.question(`⌛ Вы хотите снять ${count} 💰галлеонов c счета ${user_get.name}, но счет этого ${user_get.spec} ${user_get.gold}. Уверены, что хотите сделать баланс: ${user_get.gold-count}`,
                {
                    keyboard: Keyboard.builder()
                    .textButton({
                        label: 'Да',
                        payload: {
                            command: 'confirm'
                        },
                        color: 'secondary'
                    })
                    .textButton({
                        label: 'Нет',
                        payload: {
                            command: 'gold_down'
                        },
                        color: 'secondary'
                    })
                    .oneTime().inline()
                    }
                )
                if (confirmq.payload.command === 'confirm') {
                    const money_put = await prisma.user.update({
                        where: {
                            id: user_get.id
                        },
                        data: {
                            gold: user_get.gold - count
                        }
                    })
                    try {
                        await vk.api.messages.send({
                            user_id: user_get.idvk,
                            random_id: 0,
                            message: `⚙ С вас снято ${count}💰. \nВаш счёт: ${money_put.gold}💰 \n Уведомление: ${messa}`
                        })
                        context.send(`⚙ Операция завершена успешно`)
                    } catch (error) {
                        console.log(`User ${user_get.idvk} blocked chating with bank`)
                    }
                    await vk.api.messages.send({
                        peer_id: chat_id,
                        random_id: 0,
                        message: `⚙ @id${context.senderId}(Admin) > "-💰" > ${money_put.gold+count}💰-${count}💰=${money_put.gold}💰 для @id${user_get.idvk}(${user_get.name}) 🧷: ${messa}`
                    })
                    console.log(`User ${user_get.idvk} lost ${count} gold. Him/Her bank now ${money_put.gold}`)
                } else {
                    context.send(`💡 Нужно быть жестче! Греби бабло`)
                }
            }
        }
        async function Xp_Up(id: number) {
            const count: number = await Ipnut_Gold() 
            const messa: string = await Ipnut_Message()
            const user_get: any = await prisma.user.findFirst({
                where: {
                    id
                }
            })
            const money_put = await prisma.user.update({
                where: {
                    id: user_get.id
                },
                data: {
                    xp: user_get.xp + count
                }
            })
            try {
                await vk.api.messages.send({
                    user_id: user_get.idvk,
                    random_id: 0,
                    message: `⚙ Вам начислено ${count}🧙. \nВаш МО: ${money_put.xp}🧙 \n Уведомление: ${messa}`
                })
                context.send(`⚙ Операция завершена успешно`)
            } catch (error) {
                console.log(`User ${user_get.idvk} blocked chating with bank`)
            }
            await vk.api.messages.send({
                peer_id: chat_id,
                random_id: 0,
                message: `⚙ @id${context.senderId}(Admin) > "+🧙" > ${money_put.xp-count}🧙+${count}🧙=${money_put.xp}🧙 для @id${user_get.idvk}(${user_get.name}) 🧷: ${messa}`
            })
            console.log(`User ${user_get.idvk} got ${count} MO. Him/Her XP now ${money_put.xp}`)
        }
        async function Xp_Down(id: number) {
            const count: number = await Ipnut_Gold() 
            const messa: string = await Ipnut_Message()
            const user_get: any = await prisma.user.findFirst({
                where: {
                    id
                }
            })
            if (user_get.xp-count >= 0) {
                const money_put = await prisma.user.update({
                    where: {
                        id: user_get.id
                    },
                    data: {
                        xp: user_get.xp - count
                    }
                })
                try {
                    await vk.api.messages.send({
                        user_id: user_get.idvk,
                        random_id: 0,
                        message: `⚙ С вас снято ${count}🧙. \nВаш МО: ${money_put.xp}🧙  \n Уведомление: ${messa}`
                    })
                    context.send(`⚙ Операция завершена успешно`)
                } catch (error) {
                    console.log(`User ${user_get.idvk} blocked chating with bank`)
                }
                await vk.api.messages.send({
                    peer_id: chat_id,
                    random_id: 0,
                    message: `⚙ @id${context.senderId}(Admin) > "-🧙" > ${money_put.xp+count}🧙-${count}🧙=${money_put.xp}🧙 для @id${user_get.idvk}(${user_get.name}) 🧷: ${messa}`
                })
                console.log(`User ${user_get.idvk} lost ${count} MO. Him/Her XP now ${money_put.xp}`)
            } else {
                context.send(`⌛ Вы хотите снять ${count} 🧙магического опыта c счета ${user_get.name}, но счет этого ${user_get.spec} ${user_get.xp}. Уверены, что хотите сделать баланс: ${user_get.xp-count}? (Автоподтверждение)`)
                const money_put = await prisma.user.update({
                    where: {
                        id: user_get.id
                    },
                    data: {
                        xp: user_get.xp - count
                    }
                })
                try {
                    await vk.api.messages.send({
                        user_id: user_get.idvk,
                        random_id: 0,
                        message: `⚙ С вас снято ${count}🧙. \nВаш МО: ${money_put.xp}🧙  \n Уведомление: ${messa}`
                    })
                    context.send(`⚙ Операция завершена успешно`)
                } catch (error) {
                    console.log(`User ${user_get.idvk} blocked chating with bank`)
                }
                await vk.api.messages.send({
                    peer_id: chat_id,
                    random_id: 0,
                    message: `⚙ @id${context.senderId}(Admin) > "-🧙" > ${money_put.xp+count}🧙-${count}🧙=${money_put.xp}🧙 для @id${user_get.idvk}(${user_get.name}) 🧷: ${messa}`
                })
                console.log(`User ${user_get.idvk} lost ${count} MO. Him/Her XP now ${money_put.xp}`)
            }
        }
        async function Artefact_Show(id: number) { 
            const artefact = await prisma.artefact.findMany({
                where: {
                    id_user: id
                }
            })
            if (artefact.length > 0) {
                artefact.forEach(async element => {
                    context.send(`
                            💬: ${element.name}
                            🔧: ${element.type}${element.label}
                            🧷:  ${element.description}
                        `,
                        {
                            keyboard: Keyboard.builder()
                            .textButton({
                                label: 'Удалить🔮',
                                payload: {
                                    command: `${element.id}`
                                },
                                color: 'secondary'
                            })
                            .oneTime().inline()
                        }
                    )
                });
            } else {
                context.send(`✉ Артефакты отсутствуют =(`)
            }
            console.log(`Admin ${context.senderId} see artefacts from user UID: ${id}`)
        }
        hearManager.hear(/Удалить🔮/, async (context) => {
            if (context.messagePayload == null) {
                return
            }
            const art_get: any = await prisma.artefact.findFirst({
                where: {
                    id: Number(context.messagePayload.command)
                }
            })
            if (art_get) {
                const art_del = await prisma.artefact.delete({
                    where: {
                        id: Number(context.messagePayload.command)
                    }
                })
                context.send(`⚙ Удален артефакт ${art_del.name}`)
                const user_find = await prisma.user.findFirst({
                    where: {
                        id: art_del.id_user
                    }
                })
                if (user_find) {
                    try {
                        await vk.api.messages.send({
                            user_id: user_find.idvk,
                            random_id: 0,
                            message: `⚙ Ваш артефакт ${art_del.name} изьял ОМОН!`
                        })
                        context.send(`⚙ Удаление артефакта успешно завершено`)
                    } catch (error) {
                        console.log(`User ${user_find.idvk} blocked chating with bank`)
                    }
                    await vk.api.messages.send({
                        peer_id: chat_id,
                        random_id: 0,
                        message: `⚙ @id${context.senderId}(Admin) > "🚫🔮" > артефакт ${art_del.name} изьял ОМОН! у @id${user_find.idvk}(${user_find.name})`
                    })
                }
                console.log(`Admin ${context.senderId} destroy artefact from user UID: ${user_find?.idvk}`)
            }
            await Keyboard_Index(context, '💡 Был артефакт, нееет артефакта!')
        })
        async function Artefact_Add(id: number, count: number) {
            let datas: any = []
            let trigger = false
            while (trigger == false) {
                const name: any = await context.question(`
                    ⌛ Внимание! запущена процедура генерации Артефакта для банковского счёта 💳:${id}
                    🧷 Укажите для нового 🔮артефакта название:
                `)
                if (name.text.length <= 30) {
                    trigger = true
                    datas.push({name: `${name.text}`})
                } else {
                    context.send(`💡 Ввведите до 30 символов включительно!`)
                }
            }

            trigger = false
            while (trigger == false) {
                const type: any = await context.question(`
                        🧷 Укажите для нового 🔮артефакта тип применения:
                        🕐 — одноразовое; ♾ — многоразовое.
                    `,
                    {
                        keyboard: Keyboard.builder()
                        .textButton({
                            label: '🕐',
                            payload: {
                                command: 'Одноразовый'
                            },
                            color: 'secondary'
                        })
                        .textButton({
                            label: '♾',
                            payload: {
                                command: 'Многоразовый'
                            },
                            color: 'secondary'
                        }).oneTime().inline()
                    }
                )
                if (type.payload) {
                    trigger = true
                    datas.push({label: `${type.text}`})
                    datas.push({type: `${type.payload.command}`})
                } else {
                    context.send(`💡 Может лучше по кнопочкам жать?`)
                }
            }

            trigger = false
            while (trigger == false) {
                const description: any = await context.question(`
                    🧷 Укажите для нового 🔮артефакта ссылку на картинку самого артефакта из альбома группы Хогвартс Онлайн:
                `)
                if (description.text.length <= 1000) {
                    trigger = true
                    datas.push({description: `${description.text}`})
                } else {
                    context.send(`💡 Ввведите до 1000 символов включительно!`)
                }
            }
            const target: any = await prisma.user.findFirst({
                where: {
                    id
                }
            })
            const artefact_create = await prisma.artefact.create({
                data: {
                    id_user: id,
                    name: datas[0].name,
                    label: datas[1].label,
                    type: datas[2].type,
                    description: datas[3].description
                }
            })
            try {
                await vk.api.messages.send({
                    user_id: target.idvk,
                    random_id: 0,
                    message: `⚙ Поздравляем! Вы получили новый 🔮: ${artefact_create.name}
                        ${artefact_create.label}: ${artefact_create.type}
                    `
                })
                context.send(`⚙ Добавление артефакта успешно завершено`)
            } catch (error) {
                console.log(`User ${target.idvk} blocked chating with bank`)
            }
            await vk.api.messages.send({
                peer_id: chat_id,
                random_id: 0,
                message: `⚙ @id${context.senderId}(Admin) > "➕🔮" > артефакт ${artefact_create.name} получает @id${target.idvk}(${target.name})`
            })
            console.log(`Admin ${context.senderId} create artefact for user: ${target.idvk}`)
            context.send(`⚙ Операция завершена успешно`)
        }
        async function Back(id: number, count: number) {
            console.log(`Admin ${context.senderId} canceled operation for user UID: ${id}`)
            context.send(`⚙ Операция отменена пользователем.`)
        }
        async function Ipnut_Gold() {
            let golden = 0
            let money_check = false
            while (money_check == false) {
                const gold = await context.question(`
                    🧷 Введите количество для операции ${ans.text}:
                `)
                if (typeof Number(gold.text) == "number") {
                    money_check = true
                    golden = Number(gold.text)
                } 
            }
            return golden
        }
        async function Ipnut_Message() {
            let golden = ''
            let money_check = false
            while (money_check == false) {
                const gold = await context.question(`
                    🧷 Введите уведомление пользователю ${ans.text}:
                `)
                if (gold.text) {
                    money_check = true
                    golden = gold.text
                } 
            }
            return golden
        }
        async function User_delete(id: number) {
            const user_get: any = await prisma.user.findFirst({
                where: {
                    id: id
                }
            })
            const confirmq = await context.question(`⁉ Вы уверены, что хотите удалить клиента ${user_get.name}`,
                {
                    keyboard: Keyboard.builder()
                    .textButton({
                        label: 'Да',
                        payload: {
                            command: 'confirm'
                        },
                        color: 'secondary'
                    })
                    .textButton({
                        label: 'Нет',
                        payload: {
                            command: 'gold_down'
                        },
                        color: 'secondary'
                    })
                    .oneTime().inline()
                    }
            )
            if (confirmq.payload.command === 'confirm' && user_get) {
                if (user_get) {
                    const user_del = await prisma.user.delete({
                        where: {
                            id: id
                        }
                    })
                    context.send(`❗ Удален пользователь ${user_del.name}`)
                    if (user_del) {
                        try {
                            await vk.api.messages.send({
                                user_id: user_del.idvk,
                                random_id: 0,
                                message: `❗ Ваша карточка 💳UID: ${user_del.id} больше не действительна. Спасибо, что пользовались банком Гринготтс 🏦, ${user_del.name}. Возвращайтесь к нам снова!`
                            })
                            context.send(`⚙ Операция удаления пользователя завершена успешно.`)
                        } catch (error) {
                            console.log(`User ${user_del.idvk} blocked chating with bank`)
                        }
                        await vk.api.messages.send({
                            peer_id: chat_id,
                            random_id: 0,
                            message: `⚙ @id${context.senderId}(Admin) > "🚫👤" > удаляется из банковской системы карточка @id${user_del.idvk}(${user_del.name})`
                        })
                    }
                    console.log(`Admin ${context.senderId} deleted user: ${user_del.idvk}`)
                } 
            } else {
                context.send(`⚙ Удаление ${user_get.name} отменено.`)
            }
        }

        async function Edit_Class(id: number){
            const user: any = await prisma.user.findFirst({
                where: {
                    id: id
                }
            })
            let answer_check = false
            while (answer_check == false) {
                const answer1: any = await context.question(`
                    🧷 Укажите положение в Хогвартс Онлайн для ${user.name}, имеющего текущий статус: ${user.class}.
                    `,
                    {
                        keyboard: Keyboard.builder()
                        .textButton({
                            label: 'Ученик',
                            payload: {
                                command: 'grif'
                            },
                            color: 'secondary'
                        })
                        .textButton({
                            label: 'Профессор',
                            payload: {
                                command: 'coga'
                            },
                            color: 'secondary'
                        })
                        .textButton({
                            label: 'Житель',
                            payload: {
                                command: 'sliz'
                            },
                            color: 'secondary'
                        }).oneTime().inline()
                    }
                )
                if (!answer1.payload) {
                    context.send(`💡 Жмите только по кнопкам с иконками!`)
                } else {
                    const update_class = await prisma.user.update({
                        where: {
                            id: user.id
                        },
                        data: {
                            class: answer1.text
                        }
                    })
                    if (update_class) {
                        context.send(`⚙ Для пользователя 💳UID которого ${user.id}, произведена смена положения с ${user.class} на ${update_class.class}.`)
                        try {
                            await vk.api.messages.send({
                                user_id: user.idvk,
                                random_id: 0,
                                message: `⚙ Ваше положение в Хогвартс Онлайн изменилось с ${user.class} на ${update_class.class}.`
                            })
                            context.send(`⚙ Операция смены положения пользователя завершена успешно.`)
                        } catch (error) {
                            console.log(`User ${user.idvk} blocked chating with bank`)
                        }
                        await vk.api.messages.send({
                            peer_id: chat_id,
                            random_id: 0,
                            message: `⚙ @id${context.senderId}(Admin) > "✏👤Положение" > положение изменилось с ${user.class} на ${update_class.class} для @id${user.idvk}(${user.name})`
                        })
                    }
                    answer_check = true
                }
            }
        }
        async function Edit_Spec(id: number){
            const user: any = await prisma.user.findFirst({
                where: {
                    id: id
                }
            })
            let spec_check = false
		    while (spec_check == false) {
                const spec: any = await context.question(`
                    🧷 Укажите специализацию в Хогвартс Онлайн. Для ${user.name}.Если он/она профессор/житель, введите должность. Если студент(ка), укажите факультет. \nТекущая специализация: ${user.spec}\nВведите новую:
                `)
                if (spec.text.length <= 32) {
                    spec_check = true
                    const update_spec = await prisma.user.update({
                        where: {
                            id: user.id
                        },
                        data: {
                            spec: spec.text
                        }
                    })
                    if (update_spec) {
                        context.send(`⚙ Для пользователя 💳UID которого ${user.id}, произведена смена специализации с ${user.spec} на ${update_spec.spec}.`)
                        try {
                            await vk.api.messages.send({
                                user_id: user.idvk,
                                random_id: 0,
                                message: `⚙ Ваша специализация в Хогвартс Онлайн изменилась с ${user.spec} на ${update_spec.spec}.`
                            })
                            context.send(`⚙ Операция смены специализации пользователя завершена успешно.`)
                        } catch (error) {
                            console.log(`User ${user.idvk} blocked chating with bank`)
                        }
                        await vk.api.messages.send({
                            peer_id: chat_id,
                            random_id: 0,
                            message: `⚙ @id${context.senderId}(Admin) > "✏👤Специализация" > специализация изменилась с ${user.spec} на ${update_spec.spec} для @id${user.idvk}(${user.name})`
                        })
                    }
                } else {
                    context.send(`💡 Ввведите до 32 символов включительно!`)
                }
            }
        }
        async function Edit_Name(id: number){
            const user: any = await prisma.user.findFirst({
                where: {
                    id: id
                }
            })
            let name_check = false
            while (name_check == false) {
                const name: any = await context.question(`
                    🧷 Укажите имя в Хогвартс Онлайн. Для ${user.name}. Введите новое имя до 64 символов:
                `)
                if (name.text.length <= 64) {
                    name_check = true
                    const update_name = await prisma.user.update({
                        where: {
                            id: user.id
                        },
                        data: {
                            name: name.text
                        }
                    })
                    if (update_name) {
                        context.send(`⚙ Для пользователя 💳UID которого ${user.id}, произведена смена имени с ${user.name} на ${update_name.name}.`)
                        try {
                            await vk.api.messages.send({
                                user_id: user.idvk,
                                random_id: 0,
                                message: `⚙ Ваше имя в Хогвартс Онлайн изменилось с ${user.name} на ${update_name.name}.`
                            })
                            context.send(`⚙ Операция смены имени пользователя завершена успешно.`)
                        } catch (error) {
                            console.log(`User ${user.idvk} blocked chating with bank`)
                        }
                        await vk.api.messages.send({
                            peer_id: chat_id,
                            random_id: 0,
                            message: `⚙ @id${context.senderId}(Admin) > "✏👤ФИО" > имя изменилось с ${user.name} на ${update_name.name} для @id${user.idvk}(${user.name})`
                        })
                    }
                    if (name.text.length > 32) {
                        context.send(`⚠ Новые инициалы не влезают на стандартный бланк (32 символа)! Придется использовать бланк повышенной ширины, с доплатой 1G за каждый не поместившийся символ.`)
                    }
                } else {
                    context.send(`⛔ Новое ФИО не влезают на бланк повышенной ширины (64 символа), и вообще, запрещены магическим законодательством! Заставим его/ее выплатить штраф в 30G или с помощию ОМОНА переехать в Азкабан.`)
                }
            }
        }
        async function Editor(id: number) {
            let answer_check = false
            while (answer_check == false) {
                const answer1: any = await context.question(`
                    ⌛ Переходим в режим редактирования данных, выберите сие злодейство:
                    `,
                    {
                        keyboard: Keyboard.builder()
                        .textButton({
                            label: '✏Положение',
                            payload: {
                                command: 'edit_class'
                            },
                            color: 'secondary'
                        }).row()
                        .textButton({
                            label: '✏Специализация',
                            payload: {
                                command: 'edit_spec'
                            },
                            color: 'secondary'
                        }).row()
                        .textButton({
                            label: '✏ФИО',
                            payload: {
                                command: 'edit_name'
                            },
                            color: 'secondary'
                        }).row()
                        .textButton({
                            label: '🔙',
                            payload: {
                                command: 'back'
                            },
                            color: 'secondary'
                        }).oneTime().inline()
                    }
                )
                if (!answer1.payload) {
                    context.send(`💡 Жмите только по кнопкам с иконками!`)
                } else {
                    if (answer1.payload && answer1.payload.command != 'back') {
                        answer_check = true
                        const config: any = {
                            'edit_class': Edit_Class,
                            'edit_spec': Edit_Spec,
                            'edit_name': Edit_Name
                        }
                        await config[answer1.payload.command](id)
                    } else {
                        answer_check = true
                        context.send(`⚙ Отмена редактирования`)
                    }
                }
            }
        }
        if (ans.payload && ans.payload.command != 'back') {
            const config: any = {
                'gold_up': Gold_Up,
                'gold_down': Gold_Down,
                'xp_up': Xp_Up,
                'xp_down': Xp_Down,
                'back': Back,
                'artefact_add': Artefact_Add,
                'artefact_show': Artefact_Show,
                'user_delete': User_delete,
                'editor': Editor
            }
            const answergot = await config[ans.payload.command](Number(datas[0].id))
        } else {
            context.send(`⚙ Операция отменена пользователем.`)
        }
        await Keyboard_Index(context, `💡 Как насчет еще одной операции? Может позвать доктора?`)
    })
    
    hearManager.hear(/инвентарь/, async (context) => {
        context.send({ attachment: await vk.upload.messagePhoto({ source: { value: './src/art/inventory.jpg' }  }) });
        const get_user:any = await prisma.user.findFirst({ where: { idvk: context.senderId }, include: { Trigger: true }, })
        const inventory = await prisma.inventory.findMany({ where: { id_user: get_user.id }, include: { item: true } })
        let cart = ''
        for (const i in get_user.Trigger) {
            if (get_user.Trigger[i].value == false && get_user.Trigger[i].name == 'underwear') { cart += '👜 Трусы Домашние; ' }
            if (get_user.Trigger[i].value == true && get_user.Trigger[i].name == 'beer') { cart += '👜 Сливочное пиво из Хогсмида; ' }
        }
        if (inventory.length == 0) {
            context.send(`✉ Вы еще ничего не приобрели:(`)
            await Keyboard_Index(context, `💡 Как можно было так лохануться?`)
            return
        }
        for (const i in inventory) {
            cart += `👜 ${inventory[i].item.name};`
        }
        const destructor = cart.split(';').filter(i => i)
        let compile = []
        for (const i in destructor) {
            let counter = 0
            for (const j in destructor) { if (destructor[i] != null) { if (destructor[i] == destructor[j]) { counter++ } } }
            compile.push(`${destructor[i]} x ${counter}\n`)
            counter = 0
        }
        let final: any = Array.from(new Set(compile));
        context.send(`✉ Вы приобрели следующее: \n ${final.toString().replace(/,/g, '')}`)
        console.log(`User ${context.senderId} see self inventory`)
        await Keyboard_Index(context, `💡 Что ж, имущества много не бывает, на что вообще жить??`)
    })

    hearManager.hear(/админка/, async (context: any) => {
        if (context.senderId == root) {
            const user:any = await prisma.user.findFirst({
                where: {
                    idvk: Number(context.senderId)
                }
            })
            const lvlup = await prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    id_role: 2
                }
            })
            if (lvlup) {
                context.send(`⚙ Рут права получены`)
            } else {
                context.send(`⚙ Ошибка`)
            }
        }
        await vk.api.messages.send({
            peer_id: chat_id,
            random_id: 0,
            message: `⚙ @id${context.senderId}(Root) становится администратором!)`
        })
        console.log(`Super user ${context.senderId} got root`)
        await Keyboard_Index(context, `💡 Захват мира снова в теме!`)
    })
    hearManager.hear(/права/, async (context: any) => {
        if (context.senderId == root) {
            const uid = await context.question(`
                🧷 Введите 💳UID банковского счета получателя:
			`)
			if (uid.text) {
                const get_user = await prisma.user.findFirst({
                    where: {
                        id: Number(uid.text)
                    }
                })
                if (get_user) {
                    const artefact_counter = await prisma.artefact.count({
                        where: {
                            id_user: Number(uid.text)
                        }
                    })
                    const role: any = await prisma.role.findFirst({
                        where: {
                            id: get_user.id_role
                        }
                    })
                    context.send(`
                        ✉ Открыта следующая карточка: ${get_user.class} ${get_user.name}, ${get_user.spec}:
                        
                        💳UID: ${get_user.id}
                        💰Галлеоны: ${get_user.gold}
                        🧙Магический опыт: ${get_user.xp}
                        📈Уровень: ${get_user.lvl}
                        🔮Количество артефактов: ${artefact_counter}

                        Права пользователя: ${role.name}
                    `)
                    const answer1 = await context.question(`
                        ⌛ Что будем делать?
                        `,
                        {
                            keyboard: Keyboard.builder()
                            .textButton({
                                label: 'Дать админку',
                                payload: {
                                    command: 'access'
                                },
                                color: 'secondary'
                            })
                            .textButton({
                                label: 'Снять админку',
                                payload: {
                                    command: 'denied'
                                },
                                color: 'secondary'
                            }).row()
                            .textButton({
                                label: 'Ничего не делать',
                                payload: {
                                    command: 'cancel'
                                },
                                color: 'secondary'
                            })
                            .oneTime().inline()
                        }
                    )
                    if (!answer1.payload) {
                        context.send(`💡 Жмите только по кнопкам с иконками!`)
                    } else {
                        if (answer1.payload.command === 'access') {
                            const lvlup = await prisma.user.update({
                                where: {
                                    id: get_user.id
                                },
                                data: {
                                    id_role: 2
                                }
                            })
                            if (lvlup) {
                                context.send(`⚙ Администратором становится ${get_user.name}`)
                                try {
                                    await vk.api.messages.send({
                                        user_id: get_user.idvk,
                                        random_id: 0,
                                        message: `⚙ Вас назначили администратором`
                                    })
                                    context.send(`⚙ Операция назначения администратора завершена успешно.`)
                                } catch (error) {
                                    console.log(`User ${get_user.idvk} blocked chating with bank`)
                                }
                                await vk.api.messages.send({
                                    peer_id: chat_id,
                                    random_id: 0,
                                    message: `⚙ @id${context.senderId}(Root) > делает администратором @id${get_user.idvk}(${get_user.name})`
                                })
                                console.log(`Admin ${context.senderId} set status admin for ${get_user.idvk}`)
                            } else {
                                context.send(`💡 Ошибка`)
                            }
                        }
                        if (answer1.payload.command === 'denied') {
                            const lvlup = await prisma.user.update({
                                where: {
                                    id: get_user.id
                                },
                                data: {
                                    id_role: 1
                                }
                            })
                            if (lvlup) {
                                context.send(`⚙ Обычным пользователем становится ${get_user.name}`)
                                try {
                                    await vk.api.messages.send({
                                        user_id: get_user.idvk,
                                        random_id: 0,
                                        message: `⚙ Вас понизили до обычного пользователя`
                                    })
                                    context.send(`⚙ Операция назначения пользователем завершена успешно.`)
                                } catch (error) {
                                    console.log(`User ${get_user.idvk} blocked chating with bank`)
                                }
                                await vk.api.messages.send({
                                    peer_id: chat_id,
                                    random_id: 0,
                                    message: `⚙ @id${context.senderId}(Root) > делает обычным пользователем @id${get_user.idvk}(${get_user.name})`
                                })
                                console.log(`Admin ${context.senderId} drop status admin for ${get_user.idvk}`)
                            } else {
                                context.send(`💡 Ошибка`)
                            }
                        }
                        if (answer1.payload.command === 'cancel') {
                            context.send(`💡 Тоже вариант`)
                        }
                    }
                }
			} else {
				context.send(`💡 Нет такого банковского счета!`)
			}
        }
        await Keyboard_Index(context, `💡 Повышение в должности, не всегда понижение!`)
    })
    hearManager.hear(/админы/, async (context: any) => {
        await context.send({ attachment: await vk.upload.messagePhoto({ source: { value: './src/art/admin.jpg' } }) });
        const user = await prisma.user.findFirst({ where: { idvk: context.senderId } })
        if (user?.id_role == 2) {
            const users = await prisma.user.findMany({ where: { id_role: 2 } })
            let puller = '⌛ Загрузка списка рабов... \n'
            for (const i in users) { puller += `👤 ${users[i].id} - @id${users[i].idvk}(${users[i].name}) \n` }
            context.send(`${puller}`)
        }
        console.log(`Admin ${context.senderId} see list administrators`)
        await Keyboard_Index(context, `💡 Им бы еще черные очки, и точно люди в черном!`)
    })
    hearManager.hear(/Услуги/, async (context: any) => {
        await context.send({ attachment: await vk.upload.messagePhoto({ source: { value: './src/art/service.jpg' } }) });
        const user = await prisma.user.findFirst({
            where: {
                idvk: context.senderId
            }
        })
        const selector = await context.question(`✉ Ваш баланс: ${user?.xp}🧙 ${user?.gold}💰В данный момент доступны следующие операции:`,
            {
                keyboard: Keyboard.builder()
                .textButton({
                    label: '📈',
                    payload: {
                        command: 'lvl_upper'
                    },
                    color: 'secondary'
                })
                .textButton({
                    label: '👙',
                    payload: {
                        command: 'underwear'
                    },
                    color: 'secondary'
                }).row()
                .textButton({
                    label: '🧙>💰',
                    payload: {
                        command: 'convert_mo'
                    },
                    color: 'secondary'
                })
                .textButton({
                    label: '💰>🧙',
                    payload: {
                        command: 'convert_gal'
                    },
                    color: 'secondary'
                }).row()
                .textButton({
                    label: '🍺',
                    payload: {
                        command: 'beer'
                    },
                    color: 'secondary'
                })
                .textButton({
                    label: '🔙',
                    payload: {
                        command: 'cancel'
                    },
                    color: 'secondary'
                })
                .oneTime().inline()
            }
        )
        const config: any = {
            'lvl_upper': LVL_Upper,
            'convert_mo': Convert_MO,
            'convert_gal': Convert_Gal,
            'cancel': Cancel,
            'underwear': Underwear,
            'beer': Beer
        }
        config[selector.payload.command](context)
        
        async function Beer(context: any) {
            const user: any = await prisma.user.findFirst({ where: { idvk: context.senderId } })
            const trigger: any = await prisma.trigger.findFirst({ where: { id_user: user.id, name: 'beer' } })
            if (!trigger) { 
                const trigger_init: any = await prisma.trigger.create({ data: { id_user: user.id, name: 'beer', value: false } })
                console.log(`Init beer for user ${context.senderId}`)
            }
            const trigger_check: any = await prisma.trigger.findFirst({ where: { id_user: user.id, name: 'beer' } })
            if (trigger_check.value == false) {
                const answe = await context.question(`🍺 Желаете сливочного пива прямиком из Хогсмида с доставкой на дом, всего лишь за 5💰?`, 
                    {   keyboard: Keyboard.builder()
                        .textButton({ label: '-5💰', payload: { command: 'beer' }, color: 'secondary' }).oneTime().inline()    }
                )
                if (answe.payload && user.gold >= 5) {
                    const underwear_sold: any = await prisma.user.update({ where: { id: user.id }, data: { gold: user.gold-5 } })
                    const trigger_update: any = await prisma.trigger.update({ where: { id: trigger_check.id }, data: { value: true } })
                    await context.send({ attachment: await vk.upload.messagePhoto({ source: { value: './src/art/beer.jpg' } }) });
                    context.send(`⚙ Кто-бы мог подумать, у дверей возникло сливочное пиво прямиком из Хогсмида, снято 5💰. Теперь ваш баланс: ${underwear_sold.gold}`)
                    console.log(`User ${context.senderId} sold self beer`)
                    const user_list: any = await prisma.user.findMany({})
                    const location_list: any = {
                        "Хогвартс": [ "Большой Зал", "Астрономическая Башня", "Гремучая Ива", "Часовая Башня", "Кухня", "Туалет Плаксы Миртл", "Кухня", "Зал Наказаний", "Внутренний Двор", "Запретный лес", "Правый коридор | Пятый этаж", "Деревянный мост", "Совятня", "Выручай-комната", "Комната Пивза", "Чердак", "Больничное крыло", "Вестибюль", "Опушка леса", "Библиотека Хогвартса", "Чёрное Озеро", "Лестничные пролёты", "Каменный Круг", "Кабинет Зельеварения", "Подземелья Хогвартса", "Прачечная", "Зал Славы", "Учебный Зал", "Теплицы", "Тайная Комната", "Кладбище", "Лодочный сарай", "Кабинет школьного психолога", "Коридор Одноглазой Ведьмы", "Комната 234-00", "Учительская", "Хижина Хагрида", "Коридоры", "Учительская"],
                        "Бристон": [ 'Стрип-клуб "MurMur angels-club"', "Филиал Некромантии и Бесоизгнания", "Суд", "ЗаМУРчательное кафе", "Парк", "Больница", "Мракоборческий участок", "Заповедник", "Торговый центр", "Лавка зелий и артефактов", 'Бар "У Пьюси и Винтер"', "Магическая аптека", "Бухта Ингернах", "Филиал Гильдии Артефакторов", 'Отель "Меллоу Брук"', "Закрытая пиццерия", "Волшебный зверинец",],
                        "Пиво из Хогсмида": [ 'Паб "Три метлы"', 'Трактир "Кабанья голова"']
                    }
                    const location_name : any = ["Хогвартс", "Бристон", "Пиво из Хогсмида"]
                    const selector = randomInt(0, location_name.length)
                    const tara = randomInt(0, location_list[location_name[selector]].length)
                    const rana = randomInt(0, user_list.length)
                    const task_list: any = { "Большой зал": ["Попытаться украсть несколько свечек с потолка", "Оккупировать стол другого Факультета", "Подкинуть в тарелку с чужкой едой горстку соли", "Придумать план по захвату мира", "Придумать новый праздник и отметить его", "Создать семью яблок и банана" ],
                                        "Астрономическая Башня": ["Спеть песню «И камнем вниз...»", "Скинуть водные бомбочки с башни", "Подумать, почему солнце назвали солнцем", "Поиграть в догони меня кирпич", "Проверить перила на прочность" ],
                                        "Гремучая Ива": [ "Познакомиться с ветвями дерева", "Утроить бой с деревом", "Повесить конфеты на дерево", "Устроить показ мод", "Согреть иву с помощью шарфов" ],
                                        "Часовая Башня": [ "Посчитать количество ударов часов за полдня", "Сочинить стихотворение", "Изучить механизм часов", "Зарисовать механизм часов", "Найти часового монстра" ],
                                        "Кухня": ["Приготовить шарлотку", "Помочь эльфам", "Перемыть всю посуду", "Придумать новое оригинальное блюдо", "Составить мен для профессоров на день" ],
                                        "Туалет Плаксы Миртл": [ "Познакомиться с местным призраком", "Выплакаться мисс Миртл", "Погадать на картах таро на свою судьбу", "Поиграть в карты с Миртл", "Узнать о судьбе призрака" ],
                                        "Зал наказаний": [ "Испробовать на себе орудия пыток", "Найти местных духов", "Поговорить с холодной стеной", "Засунуть арбуз в гильотину" ],
                                        "Внутренний двор": [ "Посчитать камни на тропинке", "Обнять каждого встречного", "Искупаться в Дом", "Выловить на фонтана все монетки", "Устроить день отдыха и позагорать" ],
                                        "Запретный лес": [ "Проследить за незнакомцем", "Встретить заход солнца", "Устроить охоту на зайцев", "Нарисовать пейзаж вечернего леса", "Найти отличное место для колдографий" ],
                                        "Правый коридор | Пятый этаж": [ "Нарисовать на полу портрет профессора Макгонагалд", "Поиграть в классики", "Покривляться и построить смешные рожицы" ],
                                        "Деревянный мост": [ "Спрыгнуть с моста в воду", "Посидеть на перилах", "Поиграть в шашки", "Проверить мост на прочность", "Скатиться с моста на скейте" ],
                                        "Совятня": [ "Написать письмо домой", "Покормить птиц", "Убрать помет", "Устроить тусу птицам", "Сшить совам одежду" ],
                                        "Выручай-комната": [ "Устроить вечер сказок", "Построить дом из одеял и кресел", "Устроить бой подушками" ],
                                        "Комната Пивза": [ "Прибраться в комнате", "Позаимствовать несколько книг у сэра Пивза", "Покормить хомяков сэра Пивза" ],
                                        "Чердак": [ "Сделать генеральную уборку", "Найти старинные украшения", "Прорепетировать ответ на уроке зельеварения" ],
                                        "Больничное крыло": [ "Перевязать порезанную руку", "Оставить для больных сладости", "Навестить мадам Помфри", "Нарисовать себе синяк под глазом" ],
                                        "Вестибюль": [ "Поцеловать стену", "Прокатиться на роликах", "Станцевать лезгинку", "Сделать себе боевой раскрас" ],
                                        "Опушка леса": [ "Устроить пикник с лесными духами", "Поиграть в мяч", "Съесть траву", "Поймать бабочек" ],
                                        "Библиотека Хогвартса": [ "Принести мадам Пинс в подарок коробку конфет", "Заклеить порванные книги" , "Положить в одну из книг небольшой подарочек", "Оставить в одной из книг записку" ],
                                        "Чёрное Озеро": [ "Пустить в дальнее плавание мягкую игрушку", "Запустить бумажные кораблики", "Поиграть в блинчики", "Поплескаться в воде", "Покрасоваться своими новыми плавками/купальником" ],
                                        "Лестничные пролёты": [ "Споткнуться о ступеньку и разбить коленку", "Поговорить с картинами", "Прокатиться на лестницах по всему замку" ],
                                        "Каменный Круг": [ "Сосчитать все камни в кругу", "Придумать легенду о каменном человеке", "Развести костер, чтобы согреться " ],
                                        "Кабинет Зельеварения": [ "Оставить профессору Снейпу тетрадь с его карикатурой", "Взорвать котел", "Поменять банки с игридиентами местами" ],
                                        "Подземелья Хогвартса": [ "Оставить послание змейкам", "Измазать пол искусственной кровью", "Посадить плюшевую игрушку на потухший факел" ],
                                        "Прачечная": [ "Закинуть в стирку чужие белые вещи с розовыми носками", "Затопить замок", "Разлить амортенцию на пол", "Порвать чью-то только что стиранную футболку", "Нарисовать на всей одежде черным маркером лицо профессора Макгонагалл" ],
                                        "Зал Славы": [ "Незаметно украсть один из кубков", "Поставить свою шуточную грамоту к остальным ", "Налить в кубок сок и распивать, поднимая тосты " ],
                                        "Учебный Зал": [ "Выкинуть книгу в окно", "Поджечь шторы", "Удивить всех присутствующих в зале своими жонглёрскими способностями" ],
                                        "Теплицы": [ "Спародировать мандрагору", "Посадить монетку в землю", "Закопать кусок пиццы в горшок", "Станцевать на столе танго" ],
                                        "Тайная Комната": [ "Попрыгать по лужам", "Найти чьи-то кости", "Вообразить себя супергероем", "Вооружиться вилкой и пойти в бой с самим собой " ],
                                        "Кладбище": [ "Проверить могилы ", "Выкопать маленькую могилку для своей психики", "Написать на входе в кладбище «тут был я»", "Вызвать конфетного гномика" ],
                                        "Лодочный сарай": [ "Устроить гонки на лодках без воды", "Покрасить лодку в красный цвет", "Вырезать в лодке дно", "Перекрыть вход в сарай" ],
                                        "Кабинет школьного психолога": [ "Оставить психологу под дверью открытку", "Сломать дверь в кабинет психолога ", "Зайти в кабинет психолога в одном халате", "Выпить весь чай" ],
                                        "Коридор Одноглазой Ведьмы": [ "Найти потайной проход в Хогсмид", "Оставить коробку со значками с пятой точкой кота", "Украсть один из факелов и спрятать его" ],
                                        "Комната 234-00": [ "Забрать трусы Филча, пока его нет", "Подменить миссис Норис", "Подложить Филчу под матрас горошину", "Кинуть на стол под мусор кусок мяса" ],
                                        "Учительская": [ "Принести профессорам завтрак в кабинет", "Украсть работы по заклинаниям", "Случайно пролить кофе на работы третьего курса" ],
                                        "Хижина Хагрида": [ "Сходить на чай к профессору Хагриду ", "Подарить профессору животное", "Пригласить профессора Хагрида на прогулку во внутренний двор" ],
                                        "Коридоры": [ "Примерить на себе доспехи", "Пройтись по стене", "Расставить по всем коридорам зеркала", "Побегать босиком" ],
                                        //Бристон
                                        'Стрип-клуб "MurMur angels-club"': [ "Подача резюме на работу", "Подделка документов", "Кража конфеток с ресепшена" ],
                                        "Филиал Некромантии и Бесоизгнания": [ "Воскрешение умершей бабочки", "Изгнание бесов из кошки", "Знакомство с возможным будущим местом работы" ],
                                        "Суд": [ "Знакомство с возможным будущим местом работы ", "Суд над совой, которая съела последний бутерброд", "Суд над будильником, что не дал поспать" ],
                                        "ЗаМУРчательное кафе": [ "Кошачья терапия", "Проверка заболевшего домашнего питомца", "Разложиться на стойке для заказов" ],
                                        "Парк": [ "Устроить свадьбу для двух голубей", "Посрывать листья с деревьев и собрать из них букет", "Забрать лавочку и перетаскивать её за собой по всему парку" ],
                                        "Больница": [ "Украсть вкусняшки с ресепшена", "Похищение анализов", "Шпионство в окна больницы за работниками", "Кража кресла с ресепшена" ],
                                        "Мракоборческий участок": [ "Кража ключей от решёток", "Выбить окно в участке", "Вынес всех важных документов " ],
                                        "Заповедник": [ "Кража редких животных", "Перелезть через забор к домику лесника", "Спилить несколько деревьев" ],
                                        "Торговый центр": [ "Примерка новых луков", "Закупка продуктами", "Отдых в СПА", "Занятие в бассейне " ],
                                        "Лавка зелий и артефактов": [ "Покупка зелья", "Консультация по поводу артефакта", "Разговор по душам с владельцем лавки" ],
                                        'Бар "У Пьюси и Винтер"': [ "Отдых с коктельчиком", "Потратить минимум 10 галлеонов в баре", "Полакомиться стейком из Грифона" ],
                                        "Магическая аптека": [ "Покупка лекарств от мигрени", "Покупка лекарств от болей в животе", "Покупка аскорбинок", "Покупка гемотогенок" ],
                                        "Бухта Ингернах": [ "Продажа рыбы", "Покупка удочки", "Покупка круга для купания " ],
                                        "Филиал Гильдии Артефакторов": [ "Консультация по поводу артефактов", "Знакомство с возможным местом работы", "Выпрашивание какого-нибудь артефакта" ],
                                        'Отель "Меллоу Брук"': [ "Розыгрыш администратора", "Наслаждение свежим воздухом на террасе", "Обед в ресторане" ],
                                        "Закрытая пиццерия": [ "Расспрос Джеффа о его матери", "Подкаты к присматривающему за заведением", "Просьба переночевать в пиццерии " ],
                                        "Волшебный зверинец": [ "Покупка нового животного", "Заглянуть посмотреть на животных", "Выбор домашнего питомца" ],
                                        //Паб
                                        'Паб "Три метлы"': [ "Развести мадам Розмерту на свиное жаркое", "Напиться от горя сливочным пивом ", "Угостить незнакомца медовухой" ],
                                        'Трактир "Кабанья голова"': [ "Оставить свой след на вывеске", "Выпить бокальчик смородинового Рома", "Залезть под стол и громко кукарекать" ]
                    }
                    const task = task_list[location_list[location_name[selector]][tara]][randomInt(0,task_list[location_list[location_name[selector]][tara]].length)] || "Божественный напиток"
                    await context.send(`⌛ Загружается новое событие...`)
                    const reward: number = randomInt(1, 10) //15МО = 5Г => 3MO = 1 G \2G
                    const reward2: number = randomInt(1, 3) //2G
                    await context.send( `🍻Как насчет выпить с 👤@id${user_list[rana].idvk}(${user_list[rana].name}): \n \n 🌐 ${location_name[selector]} \n 👣 ${location_list[location_name[selector]][tara]} \n ⚡ ${task} \n ✅ ${reward*5 + reward2*10} ПК+ \n🏆 ${reward2}💰 ${reward}🧙`)
                    await vk.api.messages.send({
                        peer_id: chat_id,
                        random_id: 0,
                        message: `🍻 Обнаружен отрол: \n 👤@id${user.idvk}(${user.name}) \n 👥@id${user_list[rana].idvk}(${user_list[rana].name})  \n \n 🌐 ${location_name[selector]} \n 👣 ${location_list[location_name[selector]][tara]} \n ⚡ ${task} \n ✅ ${reward*5 + reward2*10} ПК+ \n🏆 ${reward2}💰 ${reward}🧙`
                    })
                    try {
                        await vk.api.messages.send({
                            user_id: user_list[rana].idvk,
                            random_id: 0,
                            message: `⌛ Загружается новое событие...`
                        })
                        await vk.api.messages.send({
                            user_id: user_list[rana].idvk,
                            random_id: 0,
                            message: `🍻Как насчет выпить с 👤@id${user.idvk}(${user.name}): \n \n 🌐 ${location_name[selector]} \n 👣 ${location_list[location_name[selector]][tara]} \n ⚡ ${task} \n ✅ ${reward*5 + reward2*10} ПК+ \n🏆 ${reward2}💰 ${reward}🧙`
                        })
                    } catch (error) {
                        console.log(`User ${user_list[rana].idvk} blocked chating with bank!`)
                    }
                } else { context.send(`💡 Будете ждать, пока вас кто-нибудь угостит?`) }
            } else {
                const datenow: any = new Date()
                const dateold: any = new Date(trigger_check.crdate)
                if (datenow-trigger_check.crdate > 86400000) {
                    const trigger_change: any = await prisma.trigger.update({ where: { id: trigger_check.id }, data: { crdate: datenow } })
                } else {
                    await context.send(`🔔 Вы уже получали задание: ${dateold.getDate()}-${dateold.getMonth()}-${dateold.getFullYear()} ${dateold.getHours()}:${dateold.getMinutes()}! Приходите через ${((86400000-(datenow-trigger_check.crdate))/60000/60).toFixed(2)} часов.`)
                    await Keyboard_Index(context, '💡 Что, уже не терпится еще по одной?')
                    return
                }
                const answe = await context.question(`🍺 Вы точно хотите, сдать бутылку 1.5 литра за 1💰?`,
                    {   keyboard: Keyboard.builder()
                        .textButton({   label: '+1💰',
                                        payload: { command: 'beer' },
                                        color: 'secondary'                  })
                        .oneTime().inline()                                     }
                )
                if (answe.payload) {
                    const underwear_sold: any = await prisma.user.update({ where: { id: user.id }, data: { gold: user.gold+1 } })
                    const trigger_update: any = await prisma.trigger.update({ where: { id: trigger_check.id }, data: { value: false } })
                    context.send(`⚙ Даже ваш староста зауважает вас, если узнает, что вы за экологию, +1💰. Теперь ваш баланс: ${underwear_sold.gold} Когда вы сдавали стеклотару, то вслед послышалось: \n — Воу респект, респект, еще бы пластик сдавали!`)
                    console.log(`User ${context.senderId} return self beer`)
                } else { context.send(`💡 А как же восстановить честь?`) }
            }
            await Keyboard_Index(context, '💡 Интересно, и зачем нужен паспорт?')
        }
        async function Underwear(context: any) {
            const user: any = await prisma.user.findFirst({ where: { idvk: context.senderId } })
            const trigger: any = await prisma.trigger.findFirst({ where: { id_user: user.id, name: 'underwear' } })
            if (!trigger) { 
                const trigger_init: any = await prisma.trigger.create({ data: { id_user: user.id, name: 'underwear', value: false } })
                console.log(`Init underwear for user ${context.senderId}`)
            }
            const trigger_check: any = await prisma.trigger.findFirst({ where: { id_user: user.id, name: 'underwear' } })
            if (trigger_check.value == false) {
                const answe = await context.question(`✉ Заложить трусы`, 
                    {   keyboard: Keyboard.builder()
                        .textButton({ label: '+5💰', payload: { command: 'lvl_upper' }, color: 'secondary' }).oneTime().inline()    }
                )
                if (answe.payload) {
                    const underwear_sold: any = await prisma.user.update({ where: { id: user.id }, data: { gold: user.gold+5 } })
                    const trigger_update: any = await prisma.trigger.update({ where: { id: trigger_check.id }, data: { value: true } })
                    await context.send({ attachment: await vk.upload.messagePhoto({ source: { value: './src/art/underwear.jpg' } }) });
                    context.send(`⚙ Вы заложили свои трусы Гоблинам, держите 5💰. Теперь ваш баланс: ${underwear_sold.gold}`)
                    await vk.api.messages.send({
                        peer_id: chat_id,
                        random_id: 0,
                        message: `⌛ Кто-то заложил свои трусы...`
                    })
                    console.log(`User ${context.senderId} sold self underwear`)
                } else { context.send(`💡 И к чему такие стеснения?...`) }
            } else {
                const answe = await context.question(`✉ Выкупить трусы, не хотите? — тогда не жмите по кнопке!`,
                    {   keyboard: Keyboard.builder()
                        .textButton({   label: '—10💰',
                                        payload: { command: 'lvl_upper' },
                                        color: 'secondary'                  })
                        .oneTime().inline()                                     }
                )
                if (answe.payload && user.gold >= 10) {
                    const underwear_sold: any = await prisma.user.update({ where: { id: user.id }, data: { gold: user.gold-10 } })
                    const trigger_update: any = await prisma.trigger.update({ where: { id: trigger_check.id }, data: { value: false } })
                    context.send(`⚙ Вы выкупили свои трусы у Гоблинов, держите за 10💰. Теперь ваш баланс: ${underwear_sold.gold} Когда вы их забирали, то стоял шум от всего персонала банка: \n — Забирайте свои вонючие труханы, все хранилище нам завоняли!`)
                    await vk.api.messages.send({
                        peer_id: chat_id,
                        random_id: 0,
                        message: `⌛ Кто-то выкупил свои трусы...`
                    })
                    console.log(`User ${context.senderId} return self underwear`)
                } else { context.send(`💡 А как же восстановить честь?`) }
            }
            await Keyboard_Index(context, '💡 Кто бы мог подумать, что дойдет до такого?')
        }
        async function LVL_Upper(context: any) {
            const user: any = await prisma.user.findFirst({
                where: {
                    idvk: context.senderId
                }
            })
            const leveling: any = {
                1: `1 уровень — стандартные возможности. Разрешается использование только волшебной палочки.`,
                2: `2 уровень — возможность добычи ингредиентов для зелий и т.д. в теплицах.`,
                3: `3 уровень — разрешается поход в Хогсмид, доступен к покупке порошок мгновенной тьмы. Разрешается вступить в "Дуэльный Клуб".`,
                4: `4 уровень — возможность пользоваться услугами банка "Гринготтс" в полной мере. Самостоятельное изучение любых трёх заклинаний, которые вы должны будете написать Флитвику. Чтобы вы могли их использовать, вы должны описать изучение каждого минимум в 15 комп. строках, и после двух использования в локациях заклинание будет действовать стабильно. Заклинания можно выбрать те, что изучаются на более старших курсах, чем сейчас вы (максимум на два вперёд).`,
                5: `5 уровень — разрешается использование невербальных заклинаний.`,
                6: `6 уровень — доступно к покупке любовное зелье. Доступ к получению ингредиентов в кладовке профессора Снейпа с зельями. Доступна окклюменция.`,
                7: `7 уровень — возможность обучиться анимагии, доступна к покупке мантия невидимости. Использование заклинаний без волшебной палочки. Доступна легилименция.,
                Также становится возможным укорочение постов для изучения заклинаний. 7 строк ПК вместо 15.`,
                8: `8 уровень — возможность стать полноценным работником газеты "Ежедневного Пророка" и получать за каждую статью по 15 МО и по 10 галлеонов. Открытие рынка магических животных от ХХХ. Можно купить зверька, на рынке будут выставлены его характеристики.`,
                9: `9 уровень — возможность обучиться трансгресии, доступ к изучению тёмной магии.`,
                10: `10 уровень — создание собственных заклинаний и изобретение зелий/растений и т.д.`,
                11: `11 уровень — обычный уровень`,
                12: `12 уровень — редкий уровень`,
                13: `13 уровень — эпический уровень`,
                14: `14 уровень — легендарный уровень`,
                15: `15 уровень — мифический уровень`,
            }
            if (user.lvl == 0) {
                const user_update = await prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        lvl: user.lvl+1
                    }
                })
                if (user_update) {
                    await context.send(`⚙ Ваш уровень повышен с ${user.lvl} до ${user_update.lvl}. Первый раз бесплатно, далее за уровень по 150🧙\n 🏦Разблокировка: ${leveling[user_update.lvl]}`)
                    await Keyboard_Index(context, `💡 Твой первый уровень? — это только начало!`)
                    console.log(`User ${context.senderId} lvl up from ${user.lvl} to ${user_update.lvl}`)
                    await vk.api.messages.send({
                        peer_id: chat_id,
                        random_id: 0,
                        message: `📈 @id${user.idvk}(${user.name}) повышает уровень с ${user.lvl} до ${user_update.lvl}.`
                    })
                    return
                }
                
            }
            if (user.xp >= 150 && user.lvl < 15) {
                const user_update = await prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        xp: user.xp-150,
                        lvl: user.lvl+1
                    }
                })
                context.send(`⚙ Ваш уровень повышен с ${user.lvl} до ${user_update.lvl}. Остаток: ${user_update.xp}🧙 \n 🏦Разблокировка: ${leveling[user_update.lvl]}`)
                await vk.api.messages.send({
                    peer_id: chat_id,
                    random_id: 0,
                    message: `📈 @id${user.idvk}(${user.name}) повышает уровень с ${user.lvl} до ${user_update.lvl}.`
                })
                await Keyboard_Index(context, `💡 Неужели можно стать еще мощнее?`)
                console.log(`User ${context.senderId} lvl up from ${user.lvl} to ${user_update.lvl}`)
            } else {
                if (user.lvl >= 15) {
                    context.send(`💡 Уровень повыше невозможно постичь...`)
                    await Keyboard_Index(context, `💡 Вы достигли предела, хотя бесконечность — не предел.`)
                    console.log(`User ${context.senderId} lvl up from finally anytime`)
                    return
                }
                context.send(`💡 Недостаточно магического опыта! Необходимо 150🧙 для повышения уровня.`)
                await Keyboard_Index(context, `💡 Ха—ха, наивно было полагать, что можно стать сильнее без достаточного магического опыта`)
                console.log(`User ${context.senderId} have not enough MO for lvl up from ${user.lvl} to ${user.lvl++}`)
            }
        }
        async function Convert_MO(context: any) {
            const user: any = await prisma.user.findFirst({
                where: {
                    idvk: context.senderId
                }
            })
            const count = await context.question(`✉ Текущий курс: 15🧙 => 5💰. . Доступен обмен ${Math.floor(user.xp/15)*15}🧙 на ${Math.floor(user.xp/15)*15/3}💰. При полной конвертации у вас будет ${user.gold + Math.floor(user.xp/15)*15/3}💰 на счету. \n Введите количество магического опыта для конвертации в галлеоны:`)
            if (Number(count.text) >= 15 && Number(count.text) <= user.xp) {
                const convert_gal = await prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        gold: user.gold+Math.floor(count.text/15)*15/3,
                        xp: user.xp-Math.floor(count.text/15)*15
                    }
                })
                console.log(`User ${context.senderId} converted ${Math.floor(count.text/15)*15}MO in ${Math.floor(count.text/15)*15/3}G`)
                await context.send({ attachment: await vk.upload.messagePhoto({ source: { value: './src/art/boss.jpg' } }) });
                context.send(`⌛ Конвертирование ${Math.floor(count.text/15)*15}🧙 в ${Math.floor(count.text/15)*15/3}💰 произошло успешно`)
                await vk.api.messages.send({
                    peer_id: chat_id,
                    random_id: 0,
                    message: `⌛ @id${user.idvk}(${user.name}) конвертирует ${Math.floor(count.text/15)*15}🧙 в ${Math.floor(count.text/15)*15/3}💰.`
                })
            } else {
                context.send(`💡 Ошибка конвертации`)
            }
            await Keyboard_Index(context, `💡 А кто говорил, что конвертация магического опыта будет выгодной?`)
        }
        async function Convert_Gal(context: any) {
            const user: any = await prisma.user.findFirst({
                where: {
                    idvk: context.senderId
                }
            })
            const count = await context.question(`✉ Текущий курс: 1💰 => 2🧙. . Доступен обмен ${user.gold}💰 на ${user.gold*2}🧙. При полной конвертации у вас будет ${user.xp + user.gold*2}🧙 на счету. \n Введите количество галлеонов для конвертации в магический опыт:`)
            if (Number(count.text) >= 0 && Number(count.text) <= user.gold) {
                const convert_gal = await prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        gold: user.gold-count.text,
                        xp: user.xp+count.text*2
                    }
                })
                console.log(`User ${context.senderId} converted ${count.text} G in ${count.text*2}MO`)
                await context.send({ attachment: await vk.upload.messagePhoto({ source: { value: './src/art/boss.jpg' } }) });
                context.send(`⌛ Конвертирование ${count.text}💰 в ${count.text*2}🧙 произошло успешно`)
                await vk.api.messages.send({
                    peer_id: chat_id,
                    random_id: 0,
                    message: `⌛ @id${user.idvk}(${user.name}) конвертирует ${count.text}💰 в ${count.text*2}🧙.`
                })
            } else {
                context.send(`💡 Ошибка конвертации`)
            }
            await Keyboard_Index(context, `💡 А кто говорил, что конвертация галлеонов будет выгодной?`)
        }
        async function Cancel(context: any) {
            context.send(`💡 Услуги отозваны.`)
        }
        const underwear = await prisma.trigger.count({
            where: {    name:   'underwear',
                        value:  true         }
        })
        await Keyboard_Index(context, `💡 ${underwear} человек уже заложило свои труселя, как на счёт твоих?`)
    })
    hearManager.hear(/енотик/, async (context: any) => {
        if (await Accessed(context) == 2) {
            await context.sendDocuments({ value: `./prisma/dev.db`, filename: `dev.db` }, { message: '💡 Открывать на сайте: https://sqliteonline.com/' } );
            await vk.api.messages.send({
                peer_id: chat_id,
                random_id: 0,
                message: `‼ @id${context.senderId}(Admin) делает бекап баз данных dev.db.`
            })
        }
    })
}

    