const express = require('express');
const app = express();
const cors = require('cors')

const port = 3500;

const escpos = require('escpos');
escpos.Network = require('escpos-network');

app.use(express.json());

app.use(cors({
    origin: "*",
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["POST"],
    credentials: true,
}));

app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});

app.post('/ticket/print', async (req, res) => {
    const printTicketDTO = req.body;
    console.log('JSON BODY: ', JSON.stringify(req.body));
    const networkDevice = new escpos.Network('http://192.168.1.248', 9100);
    const printer = new escpos.Printer(networkDevice);

    const response = {
        requestId: printTicketDTO.requestId,
        departmentQueueId: printTicketDTO.departmentQueueId,
        ledId: printTicketDTO.ledId,
    }

    await networkDevice.open(async (err) => {
        console.log('ERRORE CONNESSIONE: ', err);
        if (!!err) {
            await closeConnection(printer, networkDevice);

            return res.status(500)
                .send({
                    ...response,
                    error: {
                        message: `Impossibile connettersi alla stampante, non è connessa ad internet, manca la connessione o l'indirizzo IP è errato`,
                        errorType: "OfflineCauseStatus",
                    }
                });
        }

        let errors = [];

        try {
            printer.getStatuses(async statuses => {
                errors.push(...statuses.map((status) => status.toJSON().statuses.filter(s => s.status === "error").map(e => errorMapper(e))).flat())

                if (errors.length > 0) {
                    //close connection with the printer
                    await closeConnection(printer, networkDevice);

                    return res.status(500)
                        .send({ ...response, error: errors[0] });
                }

                await printer
                    .flush()
                    .font('a')
                    .align('ct')
                    .size(2, 2)
                    .text(`Reparto`)
                    .text(printTicketDTO.departmentName)
                    .size(1, 1)
                    .text("Il tuo numero e'")
                    .size(7, 7)
                    .text(printTicketDTO.currentLastNumber)
                    .size(1, 1)
                    .text(`Davanti a te ${!printTicketDTO.queueLength ? "non ci sono persone" :
                        printTicketDTO.queueLength === 1 ? "c'e' una persona" : `ci sono ${printTicketDTO.queueLength} persone`}`)
                    .feed()
                    .feed()
                    .cut(true, 3);

                await closeConnection(printer, networkDevice);

                return res.status(200)
                    .send(response);
            });

        } catch (e) {

            return res.status(500)
                .send({
                    ...response,
                    error: {
                        message: `Impossibile stampare il biglietto`,
                        errorType: "PrinterError",
                    }
                });
        }

    });
});

async function closeConnection(printer, networkDevice) {
    await printer.close();
    networkDevice.close();
}
