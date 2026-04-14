const express = require('express');
const {
    getAllUsers,
    getUserById,
    updateUser,
    resetPassword,
    deleteUser
} = require('../controllers/adminUsersController');

const router = express.Router();

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.post('/:id/reset-password', resetPassword);
router.delete('/:id', deleteUser);

module.exports = router;