import {
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  setSeconds,
  format,
  isAfter,
} from 'date-fns';
import { Op } from 'sequelize';
import Appointment from '../models/Appointment';

class AvailableController {
  async index(req, res) {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    const searchDate = Number(date);

    // 2019-10-25 13:15:00 Forma que recebe do frontend

    const appointments = await Appointment.findAll({
      // Verifica appointments do dia que não estão cancelados
      where: {
        provider_id: req.params.providerId,
        canceled_at: null,
        date: {
          [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
        },
      },
    });

    const schedule = [
      // Horarios de atendimento de um provider (Pode ser alterado para dinamico)
      '08:00', // 2019-10-25 08:00:00
      '09:00', // 2019-10-25 09:00:00
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
      '19:00',
    ];

    // objeto que vai retornar os horarios disponiveis
    const available = schedule.map(time => {
      const [hour, minute] = time.split(':');
      const value = setSeconds(
        setMinutes(setHours(searchDate, hour), minute),
        0
      );
      return {
        time,
        value: format(value, "yyyy-MM-dd'T'HH:mm:ssxxx"),
        available:
          isAfter(value, new Date()) && // Retorna boolean se horario já passou ? false : true
          !appointments.find(a => format(a.date, 'HH:mm') === time), // Busca nos appointments do dia se o date = time
      };
    });

    return res.json(available);
  }
}

export default new AvailableController();
