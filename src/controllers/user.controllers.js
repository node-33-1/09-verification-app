const catchError = require('../utils/catchError');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail');
const EmailCode = require('../models/EmailCode');

const getAll = catchError(async(req, res) => {
    const results = await User.findAll();
    return res.json(results);
});

const create = catchError(async(req, res) => {
    const { email, password, firstName, lastName, country, image, frontBaseUrl } = req.body;
    const encriptedPassword = await bcrypt.hash(password, 10);
    const result = await User.create({
        email, password: encriptedPassword, firstName, lastName, country, image
    });

    const code = require('crypto').randomBytes(32).toString("hex");
    const link = `${frontBaseUrl}/${code}`;

    await EmailCode.create({
        code,
        userId: result.id,
    });

    await sendEmail({
        to: email,
        subject: "Verify email for user app",
        html: `
            <h1>Hello ${firstName} ${lastName}</h1>
            <p><a href="${link}">${link}</a></p>
            <p><b>Code: </b> ${code}</p>
            <b>Gracias por iniciar sesión en user app</b>
        `,
    });
    
    return res.status(201).json(result);
});

const getOne = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await User.findByPk(id);
    if(!result) return res.sendStatus(404);
    return res.json(result);
});

const remove = catchError(async(req, res) => {
    const { id } = req.params;
    await User.destroy({ where: {id} });
    return res.sendStatus(204);
});

const update = catchError(async(req, res) => {
    const { id } = req.params;
    const { email, firstName, lastName, country, image } = req.body;
    const result = await User.update(
        { email, firstName, lastName, country, image },
        { where: {id}, returning: true }
    );
    if(result[0] === 0) return res.sendStatus(404);
    return res.json(result[1][0]);
});

const verifyEmail = catchError(async(req, res) => {
    const { code } = req.params;
    const emailCode = await EmailCode.findOne({ 
        where: { code: code } 
    });
    if (!emailCode) return res.status(401).json({ message: "Código inválido" });
    const user = await User.update(
        { isVerified: true }, 
        { where: { id: emailCode.userId }, returning: true }
    );
    await emailCode.destroy();
    return res.json(user[1][0]);
});

module.exports = {
    getAll,
    create,
    getOne,
    remove,
    update,
    verifyEmail,
}