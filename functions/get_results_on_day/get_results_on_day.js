
require('dotenv').config();

const lib = require('../../lib/functions');
const { getCampaignLogByDay } = lib;

// OSDI API
const BASE_ENDPOINT = process.env.BASE_ENDPOINT;
const API_KEY = process.env.API_KEY;
const AUTH_PARAM = `osdi-api-token=${API_KEY}`;

// DG API

const DG_API_KEY = process.env.DG_API_KEY;
const DG_ENDPOINT = process.env.DG_ENDPOINT; 


// Docs on event and context https://www.netlify.com/docs/functions/#the-handler-method
const handler = async (event) => {

  const campaign_id = 6607;
  const config = {
      headers : {
          //Host : 'http://localhost:3000/',
          Authorization : `Token ${DG_API_KEY}`
      }
  }

  const url = `${DG_ENDPOINT}/action-log-feed?campaign_ids=${campaign_id}`;

  try {
    const since = event.queryStringParameters.since || '2022-07-10T13:51:00.195';
    const page = event.queryStringParameters.page || 0;

    const request = await getCampaignLogByDay(url, config, since, page);

    //request.results = sumTrackingInformation(request.data);

    return {
      statusCode: 200,
      body: JSON.stringify({ request }),
      headers: {
        "access-control-allow-origin": "*",
      }
      // // more keys you can return:
      // headers: { "headerName": "headerValue", ... },
      // isBase64Encoded: true,
    }
  } catch (error) {
    return { statusCode: 500, body: error.toString() }
  }
}

module.exports = { handler }