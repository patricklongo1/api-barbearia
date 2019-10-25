import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';

import User from '../models/User';
import Appointment from '../models/Appointment';
import File from '../models/File';

import Notification from '../schemas/Notification';
import CancellationMail from '../jobs/CancellationMail';

import Queue from '../../lib/Queue';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      attributes: ['id', 'date'], // Limita dados retornados no json sobre appointment
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        // Add relacionamento de provider na listagem do json retornado dos appointments.
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'], // Limita dados retornados no json sobre o provider.
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'], // Limita dados retornados no json sobre o avatar.
            },
          ],
        },
      ],
    });
    return res.json(appointments);
  }

  async store(req, res) {
    try {
      const schema = Yup.object().shape({
        provider_id: Yup.number().required(),
        date: Yup.date().required(),
      });
      if (!(await schema.isValid(req.body))) {
        return res.status(400).json({ error: 'Validation fails' });
      }

      const { provider_id, date } = req.body;

      /**
       * checar se o provider_id é realmente de um provider
       */
      const isProvider = await User.findOne({
        where: { id: provider_id, provider: true },
      });

      if (!isProvider) {
        return res
          .status(401)
          .json({ error: 'You can only create appointments with providers' });
      }

      // Provider não pode marcar appointment com ele mesmo.
      if (req.userId === provider_id) {
        return res
          .status(400)
          .json({ error: 'You cant create a appointment with yourself' });
      }

      // Compara pra ver se data utilizada pelo user já passou.
      const hourStart = startOfHour(parseISO(date));
      if (isBefore(hourStart, new Date())) {
        return res.status(400).json({ error: 'Past dates are not permitted' });
      }

      // Checar se o provider está disponivel para esta data/horario
      const checkAvailability = await Appointment.findOne({
        where: {
          provider_id,
          canceled_at: null, // Verifica se tem um agendamento que não está cancelado pra este horario.
          date: hourStart,
        },
      });
      if (checkAvailability) {
        return res
          .status(400)
          .json({ error: 'Appointment date is not available' });
      }

      // Criando appointment na tabela
      const appointment = await Appointment.create({
        user_id: req.userId, // userId vem do middleware de autenticação que seta este valor quando o user faz login
        provider_id,
        date: hourStart,
      });

      // notificar provider
      const user = await User.findByPk(req.userId);
      const formattedDate = format(
        hourStart,
        "'dia' dd 'de' MMMM', ás' H:mm'h'",
        { locale: pt }
      );

      await Notification.create({
        content: `Novo agendamento de ${user.name} para ${formattedDate}`,
        user: provider_id,
      });

      return res.json(appointment);
    } catch (err) {
      return null;
    }
  }

  async destroy(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider', // Include para criar o objeto para uso no envio de email logo abaixo
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permission to cancel this appointment",
      });
    }

    const dateWithSub = subHours(appointment.date, 2); // Reduz 2 horas da data de agendamento que esta no banco
    // neste caso não precisa converter com o parseISO pois ja vem do banco como hora. quando vem da req vem como String

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'You can only cancel appointments 2 hours in advance',
      });
    }

    appointment.canceled_at = new Date();
    await appointment.save();

    await Queue.add(CancellationMail.key, {
      appointment,
    });

    return res.json(appointment);
  }
}
export default new AppointmentController();
