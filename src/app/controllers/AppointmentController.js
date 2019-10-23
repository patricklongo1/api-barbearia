import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore } from 'date-fns';

import User from '../models/User';
import Appointment from '../models/Appointment';
import File from '../models/File';

class AppointmentController {
  async index(req, res) {
    const { page } = req.query;

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
    return res.json(appointment);
  }
}

export default new AppointmentController();
