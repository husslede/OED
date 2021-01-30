/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { CSVPipelineError } = require('../csvPipeline/CustomErrors');
const fs = require('fs').promises;
const loadCsvInput = require('../pipeline-in-progress/loadCsvInput');
const Meter = require('../../models/Meter');
const success = require('../csvPipeline/success');

async function uploadReadings(req, res, filepath, conn) {

	const { createmeter: createMeter, cumulative, cumulativereset: cumulativeReset, duplications, headerrow,
		length, meter: meterName, mode, timesort: timeSort, update } = req.body; // extract query parameters

	const areReadingsCumulative = (cumulative === 'true');
	const headerRow = (headerrow === 'true');
	const readingRepetition = duplications;

	let meter = await Meter.getByName(meterName, conn)
		.catch(err => {
			if (createMeter !== 'true') {
				throw new CSVPipelineError(`Internal OED error: Meter with name ${meterName} is not found. createMeter was not set to true.`,
					err.message);
			}
		});
	if (!meter) {
		meter = new Meter(undefined, meterName, undefined, false, false, Meter.type.MAMAC, meterName);
		await meter.insert(conn)
			.catch(err => {
				throw new CSVPipelineError('Internal OED error: Failed to insert meter into the database.', err.message);
			});
	}
	const mapRowToModel = row => { return row; }; // stub func to satisfy param
	await loadCsvInput(filepath, meter.id, mapRowToModel, false, areReadingsCumulative,
		cumulativeReset, readingRepetition, undefined, headerRow, conn); // load csv data
	// TODO: If unsuccessful upload then an error will be thrown. We need to catch this error.
	fs.unlink(filepath).catch(err => log.error(`Failed to remove the file ${filepath}.`, err));
	success(req, res, 'It looks like success.'); // TODO: We need a try catch for all these awaits.
	return;
}

module.exports = uploadReadings;