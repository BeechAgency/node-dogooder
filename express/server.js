'use strict';

require('dotenv').config();

const PORT = process.env.PORT || 3001;

const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const cors = require('cors');
const axios = require('axios').default;

const app = express();

const lib = require('../lib/functions');
const { sumTrackingInformation, handleCampaignLogPagination } = lib;

// OSDI API
const BASE_ENDPOINT = process.env.BASE_ENDPOINT;
const API_KEY = process.env.API_KEY;
const AUTH_PARAM = `osdi-api-token=${API_KEY}`;


// DG API

const DG_API_KEY = process.env.DG_API_KEY;
const DG_ENDPOINT = process.env.DG_ENDPOINT; 

//const bodyParser = require('body-parser');

/*
app.use(cors({
  origin: ['domains...']
}));
*/

const router = express.Router();

router.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<div style="height: 100vh; width: 100%; overflow: hidden; background-color:black; display: flex; align-items: center;"><h1 style="font-size: 100px; text-align: center; color: white; width: 100%;">Hello? <small style="font-size: 0.6em;">Why are you here?</small></h1></div>');
  res.end();
});


router.get('/getCampaigns/', async (req, res) => {

    const config = {
        headers : {
            //Host : 'http://localhost:3000/',
            Authorization : `Token ${DG_API_KEY}`
        }
    }

    const url = `${DG_ENDPOINT}/campaigns/`;


    console.log('Get Campaigns', url);

    await axios.get(url ,config)
        .then( function( response ) {
            console.log('OK: ', response);

            const results = response.data.results;

            res.json({
                status: response.status,
                data: results,
                count : response?.data?.count
            });
        })
        .catch( function( error ) {
            console.error('ERROR: ', error?.response?.status);
        });
});


/*
router.get('/getActionSummary/', async (req, res) => {
    const config = {
        headers : {
            //Host : 'http://localhost:3000/',
            Authorization : `Token ${DG_API_KEY}`
        }
    }

    const url = `${DG_ENDPOINT}/action-summary?campaign_ids=6607`;

    await axios.get(url ,config)
        .then( function( response ) {
            console.log('OK: ', response.data);

            res.json({
                status: response.status,
                data: response.data,
                details: response.data.details,
                results : response.data.results,
                count : response?.data?.count
            });
        })
        .catch( function( error ) {
            console.error('ERROR: ', error?.response?.status);
        });
});
*/



router.get('/log/:id', async (req, res) => {
    const campaign_id = req.params.id;
    const config = {
        headers : {
            //Host : 'http://localhost:3000/',
            Authorization : `Token ${DG_API_KEY}`
        }
    }

    const url = `${DG_ENDPOINT}/action-log-feed?campaign_ids=${campaign_id}`;

    await axios.get(url ,config)
        .then( function( response ) {
            console.log('OK: ', response);

            const results = response.data;

            res.json ({
                status: response.status,
                data: results,
                count : response?.data?.count
            });
        })
        .catch( function( error ) {
            console.error('ERROR: ', error?.response?.status);
    });// await handleCampaignLogPagination(url, config);


    //request.results = sumTrackingInformation(request.data);

    //res.json({request});
});


router.get('/log-by-date/:id', async (req, res) => {

  const date = '2022-07-11';

  const campaign_id = 6607;
  const config = {
      headers : {
          //Host : 'http://localhost:3000/',
          Authorization : `Token ${DG_API_KEY}`
      }
  }

  const url = `${DG_ENDPOINT}/action-log-feed?campaign_ids=${campaign_id}`;
  const request = await lib.getCampaignLogByDay(url, config, date);

  res.json(request);

   
 

});


router.post('/', (req, res) => res.json({ postBody: req.body }));


app.use(router);

module.exports = app;

if(process.env.ENV !== 'dev') {
    app.use('/.netlify/functions/server', router);  // path must route to lambda
    app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));
    module.exports.handler = serverless(app); 
}
