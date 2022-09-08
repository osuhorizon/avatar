(async () => {
    const fastify = require("fastify")()
    const fs = require("fs")
    const Logger = require("cutesy.js")
    const mime = require("mime-types")
    const smartcrop = require("smartcrop-gm")
    const gm = require("gm").subClass({ imageMagick: true})

    const avatarCache = []

    const logger = new Logger().yellow()

    if(!fs.existsSync('./avatars')){
        fs.mkdirSync('./avatars')
        logger.send("Creating avatars folder")
    }

    let defaultAvatar;

    const files = fs.readdirSync('./avatars');

    if(!fs.existsSync('./.data/avatars/-1')){
        for (var i = 0; i < files.length; i++){
            if(files[i].startsWith(`-1.`)){ //* Add the . to prevent numbers like 10021 trigger the 1002 avatar
                defaultAvatar = files[i]
                logger.yellow().send(`Found: default (${files[i]})`)
            };
        };
    
        if(!defaultAvatar){
            logger.red().send('Error: No default avatar found. Please put your desired avatar with the name -1 into the avatars folder."')
            return process.exit(1)
        }

        const crop = (await smartcrop.crop(fs.readFileSync(`./avatars/${defaultAvatar}`), { minScale: 1.0, width: 256, height: 256, ruleOfThirds: false })).topCrop

        gm(`./avatars/${defaultAvatar}`)
        .crop(crop.width, crop.height, crop.x, crop.y)
        .resize(256, 256)
        .toBuffer((err, buffer) => {
            if(err) throw err
            avatarCache.push(mime.lookup(`./avatars/${defaultAvatar}`))
            avatarCache.push(buffer)
            logger.green().send(`default image cropped.`)
        })
    }

    fastify.get('/:id', async (req, reply) => {
        if(isNaN(req.params.id)) return;
        
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
            reply.type(avatarCache[0])
            reply.send(avatarCache[1])
            return
        }
        
        const crop = (await smartcrop.crop(fs.readFileSync(`./avatars/${filename}`), { minScale: 1.0, width: 256, height: 256, ruleOfThirds: false })).topCrop

        gm(`./avatars/${filename}`)
        .crop(crop.width, crop.height, crop.x, crop.y)
        .resize(256, 256)
        .toBuffer((err, buffer) => {
            if(err) throw err
            reply.type(mime.lookup(`./avatars/${filename}`))
            reply.send(buffer)
            logger.green().send(`Serving ${filename}`)
        })

        return reply
    })

    fastify.listen({ port: 4999 })
})();