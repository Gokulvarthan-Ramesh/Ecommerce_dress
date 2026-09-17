import { Router } from 'express';
import { AddressController } from '../controllers/addressController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', AddressController.getAddresses);
router.get('/:id', AddressController.getAddressById);
router.post('/', AddressController.createAddress);
router.put('/:id', AddressController.updateAddress);
router.patch('/:id/default', AddressController.setDefaultAddress);
router.delete('/:id', AddressController.deleteAddress);


export default router;
