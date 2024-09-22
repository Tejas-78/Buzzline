
import server from './backend/server.js';
import {connect} from '../BuzzLine/backend/config.js'

server.listen(3000,()=>{
    console.log('server listen on 3000')
    connect();
})

