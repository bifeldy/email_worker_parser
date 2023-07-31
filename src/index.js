const PostalMime = require('postal-mime');

async function streamToArrayBuffer(stream, streamSize) {
  let result = new Uint8Array(streamSize);
  let bytesRead = 0;
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    result.set(value, bytesRead);
    bytesRead += value.length;
  }
  return result;
}

function filterAddress(arrAddress) {
  let addr = '';
  if (arrAddress) {
    for (const a of arrAddress) {
      if (addr) addr += ', ';
      if (a.name) {
        addr += `"${a.name}" <${a.address}>`;
      } else {
        addr += a.address;
      }
    }
  }
  return addr;
}

export default {
  async fetch(req, env, ctx) {
    // console.log('Request', req);
    return Response.redirect('https://www.fansub.id/mailbox', 301);
  },
  async email(msg, env, ctx) {
    const rawEmail = await streamToArrayBuffer(msg.raw, msg.rawSize);
    const parser = new PostalMime.default();
    const parsedEmail = await parser.parse(rawEmail);
    const formData = new FormData();
    formData.append('Message-Id', parsedEmail.messageId);
    formData.append('Date', parsedEmail.date);
    formData.append('From', filterAddress([parsedEmail.from]));
    if (parsedEmail.to) {
      formData.append('To', filterAddress(parsedEmail.to));
    }
    if (parsedEmail.cc) {
      formData.append('Cc', filterAddress(parsedEmail.cc));
    }
    if (parsedEmail.bcc) {
      formData.append('Bcc', filterAddress(parsedEmail.bcc));
    }
    if (parsedEmail.subject) {
      formData.append('Subject', parsedEmail.subject);
    }
    if (parsedEmail.html) {
      formData.append('body-html', parsedEmail.html);
    }
    if (parsedEmail.text) {
      formData.append('body-plain', parsedEmail.text);
    }
    // console.log('Mail subject: ', parsedEmail.subject);
    // console.log('HTML version of Email: ', parsedEmail.html);
    // console.log('Text version of Email: ', parsedEmail.text);
    if (parsedEmail.attachments?.length > 0) {
      for (const att of parsedEmail.attachments) {
        // console.log('Attachment: ', att.filename);
        // console.log('Attachment disposition: ', att.disposition);
        // console.log('Attachment mime type: ', att.mimeType);
        // console.log('Attachment size: ', att.content.byteLength);
        const file = new Blob([att.content], { type: att.mimeType });
        formData.append('files', file, att.filename);
      }
    }
    console.log('Request Body: ', Object.fromEntries(Array.from(formData.entries())));
    const resp = await fetch(
      `https://www.fansub.id/api/mail-webhook?key=${env.API_KEY}`,
      {
        method: 'POST',
        // headers: {
        //   'Content-Type': 'multipart/form-data',
        // },
        body: formData
      }
    );
    console.log('Response Body', await resp.json());
    // await message.forward("bifeldy@gmail.com");
  }
};
