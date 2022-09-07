(async () => {
    const fastify = require("fastify")()
    const fs = require("fs")
    const Logger = require("cutesy.js")
    const mime = require("mime-types")
    const smartcrop = require("smartcrop-gm")
    const gm = require("gm").subClass({ imageMagick: true})
    const config = require("./config")

    const logger = new Logger().yellow()
    if(!fs.existsSync('./.data')){
        fs.mkdirSync('./.data/avatars')
        fs.mkdirSync('./.data/types')
        logger.send("Creating data folder")
    }
    if(!fs.existsSync('./avatars')){
        fs.mkdirSync('./avatars')
        logger.send("Creating avatars folder")
    }

    fastify.get('/:id', async (req, reply) => {
        if(isNaN(req.params.id)) return;
        const cache = fs.existsSync(`./.data/avatars/${req.params.id}`)

        if(cache){
            logger.green().send(`Serving ${req.params.id} from cache`)
            reply.type(fs.readFileSync(`./.data/types/${req.params.id}`, 'utf8'))
            reply.send(fs.readFileSync(`./.data/avatars/${req.params.id}`))
            return
        }

        const files = fs.readdirSync('./avatars');
        let filename;

        for (var i = 0; i < files.length; i++){
            if(files[i].startsWith(`${req.params.id}.`)){ //* Add the . to prevent numbers like 10021 trigger the 1002 avatar
                filename = files[i]
                logger.yellow().send(`Found: ${files[i]}`)
            };
        };

        if(!filename){
            logger.yellow().send(`Serving default for ${req.params.id}`)
            reply.type(fs.readFileSync(`./.data/types/-1`, 'utf8'))
            reply.send(fs.readFileSync(`./.data/avatars/-1`))
            return
        }

        const type = mime.lookup(`./avatars/${filename}`)
        fs.writeFileSync(`./.data/types/${req.params.id}`, type)
        
        const crop = (await smartcrop.crop(fs.readFileSync(`./avatars/${filename}`, {width: 256, height: 256, weight: 1.0}))).topCrop
        await gm(`./avatars/${filename}`)
        .crop(crop.width, crop.height, crop.x, crop.y)
        .resize(256, 256)
        .write(`./.data/avatars/${req.params.id}`, (err) => {
            if(err) throw err
            logger.green().send(`Image cropped, now serving.`)
            reply.type(fs.readFileSync(`./.data/types/${req.params.id}`, 'utf8'))
            reply.send(fs.readFileSync(`./.data/avatars/${req.params.id}`))
        })

        return reply
    })

    fastify.listen({ port: config.port })
    logger.purpleBlue().send("Listening on port " + config.port)
})();