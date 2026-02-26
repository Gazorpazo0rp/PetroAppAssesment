function validateTransferEventList(data) {
    // Check if input is an array
    if (!Array.isArray(data)) {
        return {
            isValid: false,
            message: 'Input must be a list'
        };
    }

    return {
        isValid: true,
        message: 'Validation successful'
    };
}

function validateTransferEvent(transferEvent) {
    // Check required fields
    const requiredFields = ['event_id', 'station_id', 'status', 'created_at'];
    for (const field of requiredFields) {
        if (!transferEvent[field]) {
            return {
                isValid: false,
                message: `Missing required field: ${field}`
            };
        }
    }

    // Validate amount is a non-negative number
    if (transferEvent.amount === undefined || transferEvent.amount === null) {
        return {
            isValid: false,
            message: 'Missing required field: amount'
        };
    }

    if (typeof transferEvent.amount !== 'number' || transferEvent.amount < 0) {
        return {
            isValid: false,
            message: 'Amount must be a non-negative number'
        };
    }

    // Validate created_at is ISO8601
    const date = new Date(transferEvent.created_at);
    if (isNaN(date.getTime())) {
        return {
            isValid: false,
            message: 'created_at must be a valid ISO8601 date'
        };
    }

    return {
        isValid: true,
        message: 'Validation successful'
    };
}

module.exports = {
    validateTransferEventList,
    validateTransferEvent
};