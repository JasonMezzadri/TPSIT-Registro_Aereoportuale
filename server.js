// Importazione dei moduli (le librerie che ci servono per far funzionare l'app)
const express = require('express'); // Framework principale per creare il server web
const path = require('path');       // Modulo integrato di Node.js per gestire i percorsi dei file
const fs = require('fs');           // Modulo "File System" per leggere e scrivere file dal disco
const csv = require('csv-parser');  // Libreria esterna per leggere i file CSV riga per riga
const xml2js = require('xml2js');   // Libreria esterna per convertire l'XML in oggetti JavaScript

// Inizializzazione dell'applicazione Express e definizione della porta del server
const app = express();
const PORT = 3000;

// MIDDLEWARE: Diciamo a Express di rendere pubblica la cartella 'public'. 
// In questo modo, quando l'utente si collega, il server invia in automatico index.html e style.css
app.use(express.static(path.join(__dirname, 'public')));

// CREAZIONE DELL'API: Definiamo la rotta '/api/oggetti'. 
// Quando il frontend (index.html) chiede dati a questo indirizzo, il server esegue questa funzione.
app.get('/api/oggetti', async (req, res) => {
    // Creiamo un array vuoto che conterrà TUTTI gli oggetti provenienti dai 3 file
    let allObjects = [];
    
    try {
        // --- 1. LETTURA DEL FILE JSON ---
        // Costruiamo il percorso sicuro verso il file
        const jsonPath = path.join(__dirname, 'data', 'oggetti_smarriti.json');
        // Leggiamo il contenuto del file come testo (utf8)
        const jsonData = fs.readFileSync(jsonPath, 'utf8');
        // JSON.parse trasforma il testo in un vero array JavaScript, poi lo uniamo (concat) al nostro array principale
        allObjects = allObjects.concat(JSON.parse(jsonData));
        
        // --- 2. LETTURA DEL FILE CSV ---
        // La lettura del CSV avviene tramite "stream" (flussi di dati). 
        // Usiamo una Promise per dire al codice: "Aspetta che la lettura sia finita prima di andare avanti"
        const csvData = await new Promise((resolve, reject) => {
            const results = [];
            const csvPath = path.join(__dirname, 'data', 'oggetti_smarriti.csv');
            
            fs.createReadStream(csvPath)
              .pipe(csv()) // Passiamo il file alla libreria csv-parser
              .on('data', (data) => results.push(data)) // Per ogni riga letta, la salviamo in 'results'
              .on('end', () => resolve(results))        // Quando ha finito, "risolve" la Promise restituendo i dati
              .on('error', (err) => reject(err));       // In caso di errore, blocca tutto
        });
        allObjects = allObjects.concat(csvData); // Uniamo i dati CSV all'array principale

        // --- 3. LETTURA DEL FILE XML ---
        const xmlPath = path.join(__dirname, 'data', 'oggetti_smarriti.xml');
        const xmlData = fs.readFileSync(xmlPath, 'utf8');
        
        // Configuriamo il parser XML. 'explicitArray: false' evita che ogni singolo elemento XML diventi un array, 
        // rendendo la struttura dei dati più pulita e simile al JSON.
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(xmlData);
        
        // Estraiamo l'array di oggetti dalla struttura XML convertita e lo uniamo all'array principale
        allObjects = allObjects.concat(result.oggetti.oggetto_smarrito);

        // --- INVIO DEI DATI AL FRONTEND ---
        // Trasformiamo l'array contenente tutti i 24 oggetti in formato JSON e lo inviamo come risposta
        res.json(allObjects);
        
    } catch (error) {
        // Se qualcosa va storto (es. manca un file), inviamo un messaggio di errore al browser
        console.error("Errore nel server:", error);
        res.status(500).send("Errore interno del server: " + error.message);
    }
});

// Avvio effettivo del server sulla porta 3000
app.listen(PORT, () => {
    console.log(`🚀 Server in ascolto. Apri il browser su: http://localhost:${PORT}`);
});