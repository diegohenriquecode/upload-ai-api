import {FastifyInstance} from "fastify";
import {z} from 'zod'
import {prisma} from "../lib/prisma";
import {openai} from "../lib/openai";
import {createReadStream} from 'node:fs';
export async function createTranscriptionRoute(app: FastifyInstance) {

  app.post('/videos/:videoId/transcription', async (req, reply) => {
    try {
      const paramsSchema = z.object({
        videoId: z.string().uuid(),
      })

      const {videoId} = paramsSchema.parse(req.params);

      const bodySchema = z.object(({
        prompt: z.string(),
      }))

      const video = await prisma.video.findUniqueOrThrow({
        where: {
          id: videoId,
        }
      })

      const videoPath = video.path
      const audioReadStream = createReadStream(videoPath)

      const {prompt} = bodySchema.parse(req.body);

      const response = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: 'whisper-1',
        language: 'pt',
        response_format: 'json',
        temperature: 0,
        prompt,
      })

      const transcription = response.text;

      await prisma.video.update({
        where: {
          id: videoId,
        },
        data: {
          transcription: response.text,
        }
      })

      return { transcription }
    } catch (err) {
      return reply.send({ error: "SOME ERROR: " + err})
    }
  })
}