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
    methods: ["GET"],
    credentials: true,
}));

app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});

app.post('/ticket/print', async (req, res) => {
    const printTicketDTO = req.body;

    const networkDevice = new escpos.Network(printTicketDTO.printerIpAddress, 9100);
    const printer = new escpos.Printer(networkDevice);

    await networkDevice.open((err) => {
        if (!!err) {
            return res.status(500)
                .send({
                    message: `Cannot connect to printer, printer is not connected, internet is down or the ip address is wrong ${printTicketDTO.ipAddress}`,
                    errorType: "OfflineCauseStatus",
                });
        }

        let errors = [];
        return printer.getStatuses(async statuses => {
            errors.push(...statuses.map((status) => status.toJSON().statuses.filter(s => s.status === "error").map(e => errorMapper(e))).flat())

            if (errors.length > 0) {
                //close connection with the printer
                await printer.close();
                networkDevice.close();
                return res.status(500).send(errors[0]);
            }

            await printer.flush();
            await printer.feed(2).close();

            networkDevice.close();

            // await printer.font('a')
            //     .align('ct')
            //     .size(2, 2)
            //     .text(`Reparto`)
            //     .text(printTicketDTO.departmentName)
            //     .size(1, 1)
            //     .text("Il tuo numero e'")
            //     .size(7, 7)
            //     .text(printTicketDTO.currentNumber)
            //     .size(1, 1)
            //     .text(`Davanti a te ${!printTicketDTO.queueLength ? "non ci sono persone" : printTicketDTO.queueLength === 1 ? "c'e' una persona" : `ci sono ${printTicketDTO.queueLength} persone`}`)
            //     .feed()
            //     .feed()
            //     .cut(true, 3)
            //     .close();
            return res.status(200).send(printTicketDTO);
        });
    });

});

function errorMapper(error) {
    switch (error.constructor.name) {
        case "PrinterStatus":
            return managePrinterStatus(error);
        case "OfflineCauseStatus":
            return manageOfflineCauseStatus(error);
        case "ErrorCauseStatus":
            return manageErrorCauseStatus(error);
        default:
            return manageRollPaperSensorStatus(error);
    }
}

function managePrinterStatus(error) {
    const errorResult= {
        message: "Errore generico della stampante",
        errorType: "PrinterError"
    }

    switch (error.bit) {
        case 3:
            errorResult.message = "La stampante è irraggiungibile";
            break;
        //case 5
        default:
            errorResult.message = "In attesa di un intervento sulla stampante";
    }

    return errorResult;
}

function manageOfflineCauseStatus(error) {
    const errorResult= {
        message: "La stampante è irraggiungibile per un motivo ignoto",
        errorType: "OfflineCauseStatus"
    }

    if (!error.value) { return errorResult; }

    switch (error.bit) {
        case 1:
            errorResult.message = "La stampante è aperta";
            break;
        case 3:
            errorResult.message = "La carta viene alimentata dal pulsante di alimentazione della carta";
            break;
        case 5:
            errorResult.message = "La carta è finita, non è possibile stampare";
            break;
        // case 6
        default:
            errorResult.message = "Errore durante la connessione";
    }

    return errorResult;
}

function manageRollPaperSensorStatus(error) {
    const errorResult= {
        message: "La stampante è incappata in un errore dovuto al rotolo di carta",
        errorType: "RollPaperSensorStatus"
    }

    if (error.bit === "5,6"&& error.value === "11") {
        errorResult.message = "La carta non è presente o non è posizionata correttamente";
    }

    return errorResult;
}

function manageErrorCauseStatus(error) {
    const errorResult= {
        message: "Errore generico della stampante",
        errorType: "GenericError"
    }

    if (!error.value) { return errorResult }

    switch (error.bit) {
        case 2:
            errorResult.message = "La stampante è aperta";
            break;
        // case 3
        default:
            errorResult.message= "Errore nel taglierino automatico";
    }

    return errorResult;
}