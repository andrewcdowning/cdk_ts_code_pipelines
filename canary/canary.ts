const synthetics = require("Synthetics");

const canary = async () => {
    await synthetics.executeHttpStep(
        "Verify Api returns sucessful response",
        process.env.API_ENDPOINT
    );
}

exports.handler = async () => {
    return await canary();
}