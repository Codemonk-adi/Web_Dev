const express = require('express');
const { signup, signin, resetPassword, sendPasswordResetMail, editProfile, getCurrentUser } = require('../controller/auth');
const { validateSignupRequest, isRequestValidated, validateSigninRequest } = require('../validators/auth');
const router = express.Router();
const {requireSignin} = require('../common-middleware');

router.post('/signup',validateSignupRequest, isRequestValidated, signup);
router.post('/signin',validateSigninRequest, isRequestValidated, signin);
router.post('/sendPasswordResetMail', sendPasswordResetMail);
router.post('/resetPassword', resetPassword);
router.post('/editProfile', requireSignin, editProfile);
router.get('/getCurrentUser', requireSignin, getCurrentUser);

module.exports = router;

/**
 * Auth routes -
 * 
 * /api/editProfile - POST - requires sign-in - takes email, firstName, lastName, companyName (all are optional) in the body; edits the profile of the currently logged in user
 * 
 * /api/getCurrentUser - GET - requires sign-in - return the profile of the currently logged in user minus the hashed password
 * 
 */