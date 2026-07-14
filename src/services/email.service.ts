import emailjs, { EmailJSResponseStatus } from '@emailjs/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import APP_CONFIG from '../core/config/app.config';

class EmailService {
  /**
   * Helper to fetch logged in user from AsyncStorage
   */
  private async getLoggedInUser(): Promise<{ email: string; name: string } | null> {
    try {
      // Check if there is a manual override email set for testing
      const overrideEmail = await AsyncStorage.getItem('@laika_email_override');

      const userStr = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER);
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          email: overrideEmail || user.email || '',
          name: user.name || 'Usuario Laika Club',
        };
      } else if (overrideEmail) {
        return {
          email: overrideEmail,
          name: 'Usuario Laika Club',
        };
      }
    } catch (e) {
      console.error('[EmailService] Error reading user session:', e);
    }
    return null;
  }

  /**
   * General-purpose email sender via EmailJS
   */
  async sendEmail(
    templateId: string,
    templateParams: Record<string, any>
  ): Promise<boolean> {
    const serviceId = APP_CONFIG.EMAILJS.SERVICE_ID;
    const publicKey = APP_CONFIG.EMAILJS.PUBLIC_KEY;
    const recipientEmail = templateParams.to_email || templateParams.user_email || 'correo no especificado';

    // Check if credentials are placeholders or empty
    if (
      !serviceId ||
      !publicKey ||
      serviceId === 'TU_SERVICE_ID' ||
      publicKey === 'TU_PUBLIC_KEY' ||
      publicKey === 'N2XvWn8j_zG9fN8mH' // placeholder public key
    ) {
      console.warn(
        `[EmailService] EmailJS is not configured. Print of email that would be sent:\n` +
        `Template ID: ${templateId}\n` +
        `Params: ${JSON.stringify(templateParams, null, 2)}`
      );
      Alert.alert(
        'Simulación de Correo (Sin Configurar)',
        `EmailJS no está configurado con tus credenciales reales en el archivo .env.\n\n` +
        `Se habría enviado una notificación a:\n👉 ${recipientEmail}\n\n` +
        `Asunto: ${templateParams.subject || 'Notificación Laika Club'}`
      );
      return false;
    }

    try {
      console.log(`[EmailService] Sending email template "${templateId}" to "${recipientEmail}"...`);
      
      // Initialize EmailJS with Public Key
      emailjs.init({
        publicKey: publicKey,
      });

      // Send the email
      await emailjs.send(
        serviceId,
        templateId,
        templateParams
      );
      
      console.log(`[EmailService] Email sent successfully.`);
      Alert.alert(
        'Correo Enviado Exitosamente',
        `Se ha enviado una notificación real a:\n👉 ${recipientEmail}\n\n` +
        `Asunto: ${templateParams.subject || 'Notificación Laika Club'}`
      );
      return true;
    } catch (error) {
      let errorMsg = 'Error desconocido';
      if (error instanceof EmailJSResponseStatus) {
        console.error('[EmailService] EmailJS failed to send email:', error.status, error.text);
        errorMsg = `${error.status}: ${error.text}`;
      } else {
        console.error('[EmailService] Unexpected error sending email:', error);
        errorMsg = error instanceof Error ? error.message : String(error);
      }

      Alert.alert(
        'Error al enviar Correo',
        `No se pudo enviar la notificación real a:\n👉 ${recipientEmail}\n\n` +
        `Detalle del error:\n❌ ${errorMsg}\n\n` +
        `Verifica que tus credenciales en el archivo .env sean válidas.`
      );
      return false;
    }
  }

  /**
   * Send notification for Ticket Purchases
   */
  async sendTicketPurchaseEmail(params: {
    eventTitle: string;
    venueName: string;
    date: string;
    time: string;
    seats: string[];
    ticketCodes: string[];
    totalPrice: number;
    toEmail?: string;
    userName?: string;
  }): Promise<boolean> {
    let email = params.toEmail;
    let name = params.userName;

    if (!email || !name) {
      const activeUser = await this.getLoggedInUser();
      if (activeUser) {
        email = email || activeUser.email;
        name = name || activeUser.name;
      }
    }

    if (!email) {
      console.warn('[EmailService] Cannot send ticket email: Destination email is missing.');
      return false;
    }

    const templateParams = {
      to_email: email,
      user_email: email,
      user_name: name || 'Cliente',
      event_title: params.eventTitle,
      venue_name: params.venueName,
      event_date: params.date,
      event_time: params.time,
      seat_label: params.seats.join(', '),
      ticket_codes: params.ticketCodes.join(', '),
      total_price: `$${params.totalPrice.toFixed(2)} MXN`,
      subject: `Tus boletos para ${params.eventTitle} - Laika Club`,
    };

    return this.sendEmail(APP_CONFIG.EMAILJS.TEMPLATES.TICKET_PURCHASE, templateParams);
  }

  /**
   * Send notification for Merchandise Purchases
   */
  async sendMerchPurchaseEmail(params: {
    items: Array<{ title: string; price: number; quantity: number }>;
    totalPrice: number;
    toEmail?: string;
    userName?: string;
  }): Promise<boolean> {
    let email = params.toEmail;
    let name = params.userName;

    if (!email || !name) {
      const activeUser = await this.getLoggedInUser();
      if (activeUser) {
        email = email || activeUser.email;
        name = name || activeUser.name;
      }
    }

    if (!email) {
      console.warn('[EmailService] Cannot send merch email: Destination email is missing.');
      return false;
    }

    // Format list of items
    const itemListText = params.items
      .map(item => `${item.quantity}x ${item.title} ($${item.price} c/u)`)
      .join('\n');

    const templateParams = {
      to_email: email,
      user_email: email,
      user_name: name || 'Cliente',
      item_list: itemListText,
      total_price: `$${params.totalPrice.toFixed(2)} MXN`,
      subject: 'Confirmación de compra de artículos - Laika Club',
    };

    return this.sendEmail(APP_CONFIG.EMAILJS.TEMPLATES.MERCH_PURCHASE, templateParams);
  }

  /**
   * Send notification for upcoming events (Proximity Alert)
   */
  async sendEventAlertEmail(params: {
    eventTitle: string;
    venueName: string;
    date: string;
    time: string;
    distance: string;
    toEmail?: string;
    userName?: string;
  }): Promise<boolean> {
    let email = params.toEmail;
    let name = params.userName;

    if (!email || !name) {
      const activeUser = await this.getLoggedInUser();
      if (activeUser) {
        email = email || activeUser.email;
        name = name || activeUser.name;
      }
    }

    if (!email) {
      console.warn('[EmailService] Cannot send event alert: Destination email is missing.');
      return false;
    }

    const templateParams = {
      to_email: email,
      user_email: email,
      user_name: name || 'Cliente',
      event_title: params.eventTitle,
      venue_name: params.venueName,
      event_date: params.date,
      event_time: params.time,
      distance: params.distance,
      subject: `¡Estás cerca! Accede a ${params.eventTitle} en ${params.venueName}`,
    };

    return this.sendEmail(APP_CONFIG.EMAILJS.TEMPLATES.EVENT_ALERT, templateParams);
  }

  /**
   * Send notification for Password Changes
   */
  async sendPasswordChangeEmail(toEmail?: string, userName?: string): Promise<boolean> {
    let email = toEmail;
    let name = userName;

    if (!email || !name) {
      const activeUser = await this.getLoggedInUser();
      if (activeUser) {
        email = email || activeUser.email;
        name = name || activeUser.name;
      }
    }

    if (!email) {
      console.warn('[EmailService] Cannot send password alert: Destination email is missing.');
      return false;
    }

    const templateParams = {
      to_email: email,
      user_email: email,
      user_name: name || 'Usuario',
      change_time: new Date().toLocaleString('es-MX'),
      subject: 'Alerta de Seguridad: Tu contraseña ha sido cambiada',
    };

    return this.sendEmail(APP_CONFIG.EMAILJS.TEMPLATES.PASSWORD_CHANGE, templateParams);
  }

  /**
   * Send notification for Coupon Rewards
   */
  async sendCouponRewardEmail(params: {
    couponCode: string;
    discount: number;
    description: string;
    expiry: string;
    toEmail?: string;
    userName?: string;
  }): Promise<boolean> {
    let email = params.toEmail;
    let name = params.userName;

    if (!email || !name) {
      const activeUser = await this.getLoggedInUser();
      if (activeUser) {
        email = email || activeUser.email;
        name = name || activeUser.name;
      }
    }

    if (!email) {
      console.warn('[EmailService] Cannot send coupon alert: Destination email is missing.');
      return false;
    }

    const templateParams = {
      to_email: email,
      user_email: email,
      user_name: name || 'Ganador',
      coupon_code: params.couponCode,
      discount: `${params.discount}%`,
      description: params.description,
      expiry: params.expiry,
      subject: `¡Felicidades! Ganaste un cupón de descuento en Laika Club`,
    };

    return this.sendEmail(APP_CONFIG.EMAILJS.TEMPLATES.COUPON_REWARD, templateParams);
  }
}

export const emailService = new EmailService();
export default emailService;
