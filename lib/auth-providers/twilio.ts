const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SID;
const client = require('twilio')(accountSid, authToken);
const MessagingResponse = require("twilio").twiml.MessagingResponse;


const sendVerification = async (phoneNumber: string, channel: string) => {
    client.verify.v2.services(verifyServiceSid)
        .verifications
        .create({to: phoneNumber, channel})
        .then((verification) => {
            console.log(verification.status);
        });
}

const checkVerification = async (phoneNumber: string, code: string) => {
    client.verify.services(verifyServiceSid)
        .verificationChecks
        .create({to: phoneNumber, code})
        .then((verification_check) => {
            console.log(verification_check.status);
        });
}



async function updateAuthTokenPromotion() {
    const authTokenPromotion = await client.accounts.v1
        .authTokenPromotion()
        .update();

    console.log(authTokenPromotion.accountSid);
}

async function createAuthTokenPromotion() {
    const authTokenPromotion = await client.accounts.v1
        .authTokenPromotion()
        .create();

    console.log(authTokenPromotion.accountSid);
}


async function sendSMS(phoneNumber: string, messageBody: string, messagingServiceSid: string) {
    client.messages
        .create({
            body: messageBody,
            messagingServiceSid: messagingServiceSid,
            to: phoneNumber,
        })
        .then((message) => console.log(message.sid));
}


async function replyToMessage(messageSid: string, messageBody: string) {
    const twiml = new MessagingResponse();
    twiml.message(messageBody);

    client.messages(messageSid)
        .update({
            body: messageBody
        })
        .then(message => console.log(message.body));
}



export { sendVerification, checkVerification, updateAuthTokenPromotion, createAuthTokenPromotion };
