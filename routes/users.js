const express = require('express');
const router = express.Router();  // create a new router object
const crypto = require('crypto'); // already exists as part of nodejs

const { createUserForm, bootstrapField, createLoginForm } = require('../forms');
const { User } = require('../models');

function getHashedPassword(password){
    // create a sha256 hashing algo
    const sha256 = crypto.createHash('sha256');
    // create the hash as hexdecimal
    const hash = sha256.update(password).digest('base64');
    return hash;
}

router.get('/register', function(req,res){
    const form = createUserForm();
    res.render('users/register', {
        'form': form.toHTML(bootstrapField)
    })
})

router.post('/register', function(req,res){
    const registerForm = createUserForm();
    registerForm.handle(req,{
        'success': async function(form) {
            // create a new user model instance
            // an instance of a model refers to one row in the table
            const user = new User({
                'username': form.data.username,
                'password': getHashedPassword(form.data.password),
                'email': form.data.email
            })

            // save the model
            await user.save(); 
            req.flash("success_messages", "Account created successfully");
            res.redirect('/users/login')
        },
        'error':function(form) {
            res.render('users/register',{
                'form': form.toHTML(bootstrapField)
            })
        }
    })
})

router.get('/login', function(req,res){
    const loginForm = createLoginForm();
    res.render('users/login',{
        'form': loginForm.toHTML(bootstrapField)
    });
})

router.post('/login', function(req,res){
    const loginForm = createLoginForm();
    loginForm.handle(req, {
        'success': async function(form) {

            // check if the user with the provided email exists or not
            let user = await User.where({
                'email': form.data.email}
            ).fetch({
                require: false  // we set require to false
                                // we don't bookshelf to throw an error
                                // if the user is not found
                                // because we want to handle the error
                                // ourselves
            })

            // if user is not found
            if (!user) {
                req.flash('error_messages', "Sorry your authentication details are incorrect");
                res.redirect('/users/login');
                return; // immediately end the function after redirect
            } else {
                // if the user is found, make sure that the password matches
                // user.get('password') --> is the password from the row in the table
                // form.data.password --> is the password that the user types into the form
                if (user.get('password') == getHashedPassword(form.data.password)) {

                    // save the user in the session
                    // req.session: allows to add data to the session file, or to change data in the session file
                    req.session.user = {
                        id: user.get('id'),
                        username: user.get('username')
                    }
                    req.flash("success_messages", "Login successful!")
                    res.redirect('/');
                } else {
                    // flash messages must go before a redirect
                    req.flash('error_messages', "Sorry your authentication details are incorrect");
                    res.redirect('/users/login')
                }
            }
        }
    })
})

// export out the router object
module.exports = router;