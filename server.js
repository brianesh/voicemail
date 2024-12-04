const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

const cors = require('cors');
app.use(cors());


// Setup nodemailer transporter (using Gmail SMTP for example)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com', // your email
        pass: 'your-email-password'  // your email password (or app password)
    }
});

// Send email route
app.post('/send-email', (req, res) => {
    const { to, subject, text } = req.body;
    const mailOptions = {
        from: 'your-email@gmail.com',
        to: to,
        subject: subject,
        text: text
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ message: 'Error sending email', error });
        }
        res.status(200).json({ message: 'Email sent successfully', info });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});


// Reply to email (basic implementation)
app.post('/reply-email', (req, res) => {
    const { to, subject, text, replyTo } = req.body;
    const mailOptions = {
        from: 'your-email@gmail.com',
        to: to,
        subject: `Re: ${subject}`,
        text: text,
        inReplyTo: replyTo, // Ensure you have a valid thread to reply to
        references: replyTo
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ message: 'Error replying email', error });
        }
        res.status(200).json({ message: 'Email replied successfully', info });
    });
});


const Imap = require('imap');
const imap = new Imap({
    user: 'your-email@gmail.com',
    password: 'your-email-password',
    host: 'imap.gmail.com',
    port: 993,
    tls: true
});

imap.once('ready', function() {
    imap.openBox('INBOX', true, function(err, box) {
        if (err) throw err;
        const f = imap.seq.fetch('1:3', { bodies: '' });
        f.on('message', function(msg, seqno) {
            msg.once('attributes', function(attrs) {
                const uid = attrs.uid;
                // Delete message by UID
                imap.addFlags(uid, ['\\Deleted'], function(err) {
                    if (err) throw err;
                    imap.expunge(function(err) {
                        if (err) throw err;
                        console.log(`Email with UID ${uid} deleted`);
                    });
                });
            });
        });
    });
});

imap.connect();
