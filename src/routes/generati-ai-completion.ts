import {FastifyInstance} from "fastify";
import {z} from 'zod'
import {OpenAIStream, streamToResponse} from 'ai';
import {prisma} from "../lib/prisma";
import {openai} from "../lib/openai";
import {createReadStream} from 'node:fs';
export async function generateAiCompletionRoute(app: FastifyInstance) {

  app.post('/ai/generate', async (req, reply) => {
    try {
      const bodySchema = z.object(({
        videoId: z.string().uuid(),
        template: z.string(),
        temperature: z.number().min(0).max(1).default(0.5),
      }))

      const { videoId, template, temperature } = bodySchema.parse(req.body);

      const video = await prisma.video.findUniqueOrThrow({
        where: {
          id: videoId,
        }
      })

      if(!video.transcription) {
        return reply.status(400).send({error: 'Video transcription was not generated yet.'})
      }

      const promptMessage = template.replace('{transcription}', video.transcription)



      const stream = OpenAIStream(
        await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-16k',
        temperature,
        messages: [
          { role: 'user', content: promptMessage }
        ],
        stream: true
      })
      )

      streamToResponse(stream, reply.raw, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        }
      })
    } catch (err) {
      return reply.send({ error: "SOME ERROR: " + err})
    }
  })
}