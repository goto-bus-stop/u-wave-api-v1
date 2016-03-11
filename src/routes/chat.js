import createRouter from 'router';

import * as controller from '../controllers/chat';
import { ROLE_MODERATOR } from '../roles';

export default function chatRoutes() {
  const router = createRouter();

  router.delete('/', (req, res) => {
    if (req.user.role < ROLE_MODERATOR) {
      return res.status(403).json('you need to be at least a moderator to do this');
    }

    controller.chatDelete(req.uwave, req.user);
    res.status(200).json('deleted chat');
  });

  router.delete('/user/:id', (req, res) => {
    if (req.user.role < ROLE_MODERATOR) {
      return res.status(403).json('you need to be at least a moderator to do this');
    }

    controller.chatDeleteByUser(req.uwave, req.user, req.params.id);
    res.status(200).json(`deleted chat ${req.params.id}`);
  });

  router.delete('/:id', (req, res) => {
    if (req.user.role < ROLE_MODERATOR) {
      return res.status(403).json('you need to be at least a moderator to do this');
    }

    controller.chatDeleteByID(req.uwave, req.user, req.params.id);
    res.status(200).json(`deleted chat by user ${req.params.id}`);
  });

  return router;
}
