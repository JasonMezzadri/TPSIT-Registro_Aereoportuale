// Importazione dei moduli necessari
const express = require('express');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const xml2js = require('xml2js');

const app = express();
const PORT = 3000;

// --- CONFIGURAZIONE MIDDLEWARE ---
// Serve a rendere accessibili i file nella cartella 'public' (HTML, CSS, JS lato client)
app.use(express.static(path.join(__dirname, 'public')));
// Permette ad Express di leggere i dati JSON inviati nel corpo delle richieste (body-parser)
app.use(express.json());

// --- GESTIONE DATI IN MEMORIA ---
// Usiamo una variabile 'cache' per simulare un database. 
// Una volta caricati i dati dai file, lavoreremo su questa variabile.
let cacheOggetti = null;

// Funzione asincrona che legge e unisce i dati da JSON, CSV e XML
async function caricaDatiIniziali() {
    let allObjects = [];
    
    try {
        // 1. Lettura JSON (Metodo sincrono)
        const jsonPath = path.join(__dirname, 'data', 'oggetti_smarriti.json');
        const jsonData = fs.readFileSync(jsonPath, 'utf8');
        allObjects = allObjects.concat(JSON.parse(jsonData));
        
        // 2. Lettura CSV (Gestita con Promise per attendere la fine del flusso di dati)
        const csvData = await new Promise((resolve, reject) => {
            const results = [];
            const csvPath = path.join(__dirname, 'data', 'oggetti_smarriti.csv');
            fs.createReadStream(csvPath)
              .pipe(csv())
              .on('data', (data) => results.push(data))
              .on('end', () => resolve(results))
              .on('error', (err) => reject(err));
        });
        allObjects = allObjects.concat(csvData);

        // 3. Lettura XML (Conversione da stringa XML a oggetto JavaScript)
        const xmlPath = path.join(__dirname, 'data', 'oggetti_smarriti.xml');
        const xmlData = fs.readFileSync(xmlPath, 'utf8');
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(xmlData);
        // Aggiungiamo l'array contenuto nel tag <oggetto_smarrito>
        allObjects = allObjects.concat(result.oggetti.oggetto_smarrito);

        return allObjects;
    } catch (error) {
        console.error("Errore durante il caricamento dei file:", error);
        throw error;
    }
}

// --- ROTTE API (ENDPOINT) ---

// Ottieni la lista di tutti gli oggetti
app.get('/api/oggetti', async (req, res) => {
    try {
        // Se la cache è vuota (primo avvio), carica i dati dai file
        if (!cacheOggetti) {
            cacheOggetti = await caricaDatiIniziali();
        }
        res.json(cacheOggetti);
    } catch (error) {
        res.status(500).send("Errore nel server: " + error.message);
    }
});

// Elimina un oggetto specifico (usato sia da Admin che da User)
app.delete('/api/oggetti/:id', (req, res) => {
    const idDaEliminare = req.params.id;
    
    if (!cacheOggetti) return res.status(400).send("Dati non pronti");

    // Filtriamo la lista: teniamo tutti tranne quello con l'ID ricevuto
    cacheOggetti = cacheOggetti.filter(obj => obj.id !== idDaEliminare);
    
    res.json({ success: true, message: "Operazione completata" });
});

// Avvio del server
app.listen(PORT, () => {
    console.log(`🚀 Server attivo su http://localhost:${PORT}/login.html`);
});