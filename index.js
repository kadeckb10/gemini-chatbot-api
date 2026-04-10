import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";

// ==== Tambahkan setup __dirname untuk ESM (import style) ====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const ai = new GoogleGenAI({
	apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = "gemini-2.5-flash-lite"
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ==== Tambahkan middleware untuk serve file static (frontend) ====
// Serve all files in public_solution (HTML, JS, CSS) at root path
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
	const { conversation } = req.body;

	try {
		if (!Array.isArray(conversation)) throw new Error('Message must be an array!');

		const contents = conversation.map(({ role, text}) => ({
			role,
			parts: [{ text }]
		}));

		const response = await ai.models.generateContent({
			model: MODEL,
			contents,
			config: {
				temperature: 0.9,
				systemInstruction: "Jawab hanya menggunakan bahasa Indonesia",
			},
		});
		res.status(200).json({result: response.text});
	} catch (e) {
		res.status(500).json({message: e.message});
	}
});

app.listen(PORT, () => {
	console.log(`Gemini ChatBot running on ${PORT}`);
});
