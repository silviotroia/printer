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

export function errorMapper(error) {
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
