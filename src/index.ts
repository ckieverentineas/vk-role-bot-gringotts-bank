import { VK, Keyboard, IMessageContextSendOptions, ContextDefaultState, MessageContext } from 'vk-io';
import { HearManager } from '@vk-io/hear';
import { PrismaClient } from '@prisma/client'
import {
    QuestionManager,
    IQuestionMessageContext
} from 'vk-io-question';
import { randomInt } from 'crypto';
import { timeStamp } from 'console';
import { registerUserRoutes } from './engine/player'
import { InitGameRoutes } from './engine/init';
import { send } from 'process';

//авторизация
export const vk = new VK({
	//token: "b603c7efd00e1ce663d70a18c8915686bbdfee594a2f8d66d77620c712df5e9c2ae9e211c4164b80df6f9",
	//pollingGroupId: 207638246
	token: "vk1.a.4RU56GK1UGfQUoYe7uydfHW60tuitMBMR-4RLXwLd0F96Cqtz3hCShUhO5taLtmhotVMGyG6tz5ujHLujhxuDc3NXunnoe5uPBr4gE7sx1qJZr2JwSdiybvFMTwVnoxT4EZgdcmDgy2X0hgnEDYJgK3r82lj7Dty4eTazFoqtNbK1opve_7Vt3RmhmllLyUL6dpUzpZAmOBc87w7X9f0ig",
	pollingGroupId: 200587399
	//token: 'd0d096ed5933ced08bc674c08134e4e47603a0443f4972d6595024ae32f8677b62032ec53ebfddc80ff16'
});

//инициализация
const questionManager = new QuestionManager();
const hearManager = new HearManager<IQuestionMessageContext>();
export const prisma = new PrismaClient()
export const root = 590776444
/*prisma.$use(async (params, next) => {
	console.log('This is middleware!')
	// Modify or interrogate params here
	console.log(params)
	return next(params)
})*/

//настройка
vk.updates.use(questionManager.middleware);
vk.updates.on('message_new', hearManager.middleware);

//регистрация роутов из других классов
InitGameRoutes(hearManager)
registerUserRoutes(hearManager)

let blocker: Array<1> = []
//миддлевар для предварительной обработки сообщений
vk.updates.on('message_new', async (context: any, next: any) => {
	if (context.text == `позвать сотрудника`) {
		if (!blocker.includes(context.senderId)) {
			blocker.push(context.senderId)
			context.send(`Включен режим удержания клиента, для возврата в нормальный режим, пишите: позвать бота`)
			console.log(`User ${context.senderId} activated mode for talk with employee`)
		}
	}
	if (context.text == `позвать бота`) {
		if (blocker.includes(context.senderId)) {
			blocker.splice(blocker.indexOf(context.senderId))
			context.send(`Банковское обслуживание переведено в штатный режим.`)
			console.log(`User ${context.senderId} return in mode for talk with bot`)
		}
	}
	if (blocker.includes(context.senderId)) {
		return
	}
	//проверяем есть ли пользователь в базах данных
	const user_check = await prisma.user.findFirst({
		where: {
			idvk: context.senderId
		}
	})
	//если пользователя нет, то начинаем регистрацию
	if (!user_check) {
		//согласие на обработку
		const answer = await context.question(
			`Как только вы открыли дверь банка Гринготтс 🏦, из ниоткуда перед вами предстали два гоблина и надменно сказали:
			— Видимо, вы здесь впервые. Прежде чем войти, распишитесь здесь о своем согласии на обработку персональных данных.
			В тот же миг в их руках магическим образом появился пергамент.`,
			{
				keyboard: Keyboard.builder()
				.textButton({
					label: '✏',
					payload: {
						command: 'Согласиться'
					},
					color: 'positive'
				})
				.row()
				.textButton({
					label: '👣',
					payload: {
						command: 'Отказаться'
					},
					color: 'negative'
				}).oneTime()
			}
		);
		
		if (!/да|yes|Согласиться|конечно|✏/i.test(answer.text|| '{}')) {
			await context.send('Вы отказались дать свое согласие, а живым отсюда никто не уходил, вас упаковали!');
			return;
		}

		//приветствие игрока
		const counter_players = await prisma.user.count()
		await context.question(`Поставив свою подпись, вы, стараясь не смотреть косо на гоблинов, вошли в здание банка, подошли к стойке, где за информационной системой сидела полная гоблинша с бородавкой на носу.`,
			{
				keyboard: Keyboard.builder()
				.textButton({
					label: 'Подойти и поздороваться',
					payload: {
						command: 'Согласиться'
					},
					color: 'positive'
				})
				.row()
				.textButton({
					label: 'Ждать, пока она закончит',
					payload: {
						command: 'Отказаться'
					},
					color: 'negative'
				}).oneTime().inline()
			}
		);
		let name_check = false
		let datas: any = []
		while (name_check == false) {
			const name = await context.question(`
			Приветствую в Банке Гринготтс🏦! Судя по всему, вы здесь впервые. Назовите ваше имя и фамилию.
			❗ Внимание! Предоставление заведомо ложных данных преследуются законом!
			`)
			if (name.text.length <= 30) {
				name_check = true
				datas.push({name: `${name.text}`})
			} else {
				context.send(`Нужно было вести ФИО персонажа до 30 символов включительно!`)
			}
		}
		let answer_check = false
		while (answer_check == false) {
			const answer1 = await context.question(`
				Укажите ваше положение в Хогвартс Онлайн
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
				context.send(`Жмите только по кнопкам с иконками!`)
			} else {
				datas.push({class: `${answer1.text}`})
				answer_check = true
			}
		}
		
		let spec_check = false
		while (spec_check == false) {
			const name = await context.question(`
				Укажите вашу специализацию в Хогвартс Онлайн. Если вы профессор/житель, введите должность. Если вы студент, укажите факультет
			`)
			if (name.text.length <= 30) {
				spec_check = true
				datas.push({spec: `${name.text}`})
			} else {
				context.send(`Ввведите до 30 символов включительно!`)
			}
		}
		
		const save = await prisma.user.create({
			data: {
				idvk: context.senderId,
				name: datas[0].name,
				class: datas[1].class,
				spec: datas[2].spec,
				id_role: 1,
				gold: 65
			}
		})
		context.send(`
			Благодарю за сотрудничество ${save.class} ${save.name}, ${save.spec}.
			⚖Вы получили банковскую карту UID: ${save.id}.
			🏦Вам зачислено ${save.gold} галлеонов
		`)
		console.log(`Success save user idvk: ${context.senderId}`)
		context.send(`Список обязательных для покупки вещей:
		1. Волшебная палочка
		2. Сова, кошка или жаба
		3. Комплект учебников
		
		Посетите Косой переулок и приобретите их первым делом!`)
		context.send(`Подсказка: Когда все операции вы успешно завершили и клавиатуры нет, напишите клава!`)
	} else {
		if (user_check.idvk == root && user_check.id_role === 2) {
			context.send(`Гоблины Банка Гриннотс приветствуют вас, для связи с нами напишите: позвать сотрудника`,
				{
					keyboard: Keyboard.builder()
					.textButton({
						label: 'карта',
						payload: {
							command: 'grif'
						},
						color: 'secondary'
					})
					.textButton({
						label: 'инвентарь',
						payload: {
							command: 'sliz'
						},
						color: 'secondary'
					}).row()
					.textButton({
						label: 'артефакты',
						payload: {
							command: 'coga'
						},
						color: 'secondary'
					})
					.textButton({
						label: 'админы',
						payload: {
							command: 'coga'
						},
						color: 'secondary'
					}).row()
					.textButton({
						label: 'Косой переулок',
						payload: {
							command: 'sliz'
						},
						color: 'secondary'
					}).row()
					.textButton({
						label: 'операции',
						payload: {
							command: 'sliz'
						},
						color: 'secondary'
					})
					.textButton({
						label: 'права',
						payload: {
							command: 'sliz'
						},
						color: 'secondary'
					}).oneTime()
				}
			)
		}else if (user_check.id_role === 2) {
			context.send(`Гоблины Банка Гриннотс приветствуют вас, для связи с нами напишите: позвать сотрудника`,
				{
					keyboard: Keyboard.builder()
					.textButton({
						label: 'карта',
						payload: {
							command: 'grif'
						},
						color: 'secondary'
					})
					.textButton({
						label: 'инвентарь',
						payload: {
							command: 'sliz'
						},
						color: 'secondary'
					}).row()
					.textButton({
						label: 'артефакты',
						payload: {
							command: 'coga'
						},
						color: 'secondary'
					})
					.textButton({
						label: 'админы',
						payload: {
							command: 'coga'
						},
						color: 'secondary'
					}).row()
					.textButton({
						label: 'Косой переулок',
						payload: {
							command: 'sliz'
						},
						color: 'secondary'
					}).row()
					.textButton({
						label: 'операции',
						payload: {
							command: 'sliz'
						},
						color: 'secondary'
					}).oneTime()
				}
			)
		} 
		if (user_check.id_role === 1) {
			context.send(`Гоблины Банка Гриннотс приветствуют вас, для связи с нами напишите: позвать сотрудника`,
				{
					keyboard: Keyboard.builder()
					.textButton({
						label: 'карта',
						payload: {
							command: 'grif'
						},
						color: 'secondary'
					}).row()
					.textButton({
						label: 'инвентарь',
						payload: {
							command: 'sliz'
						},
						color: 'secondary'
					}).row()
					.textButton({
						label: 'артефакты',
						payload: {
							command: 'coga'
						},
						color: 'secondary'
					}).row()
					.textButton({
						label: 'Косой переулок',
						payload: {
							command: 'sliz'
						},
						color: 'secondary'
					}).oneTime()
				}
			)
		}
	}
	prisma.$disconnect()
	return next();
})

vk.updates.startPolling().catch(console.error);