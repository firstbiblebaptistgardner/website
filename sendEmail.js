//import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
//const sesClient = new SESClient({region: 'us-east-1'});
let sesClient;
let SendEmailCommand;
(async ()=>{
  const m = await import('@aws-sdk/client-ses');
  sesClient = new m.SESClient({region: 'us-east-1'});
  SendEmailCommand = m.SendEmailCommand;
})();

module.exports.sendEmail = async (toAddress, subject, message) => {
  const sec = new SendEmailCommand({
    Source: 'do-not-reply@firstbiblebaptistgardner.com',
    Destination: { 
      ToAddresses: [toAddress],
    },
    Message: {
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: message,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
    },
  });
  await sesClient.send(sec);
};
