import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useState, useEffect } from "react";
import {
  FormControl,
  InputGroup,
  ListGroup,
  Form,
  Button,
  ListGroupItem,
} from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import React from 'react'
import Select from 'react-select'

import { AwesomeButton } from 'react-awesome-button';
import AwesomeButtonStyles from 'react-awesome-button/src/styles/styles.scss';

import bent from 'bent';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Chart, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function Home() {
  const [cities, setCities] = useState([""]);
  const [startDate, setStartDate] = useState(new Date());
  const [selectedOption, setSelectedOption] = useState(null);
  const [options, setOptions] = useState([]);
  const appUrl = 'http://localhost:3000/';
  const [chartData, setChartData] = useState({ datasets: [] });
  const [chartOptions, setChartOptions] = useState({});

  function plotReport1(responseRep1) {
    console.log(responseRep1['forecast'].map(x => x['stats']['day']['maxtemp_f']));

    setChartData({
      labels: responseRep1['forecast'].map(x => x['date']),
      datasets: [{
        label: 'maxtemp_f',
        data: responseRep1['forecast'].map(x => x['stats']['day']['maxtemp_f']),
        borderColor: "rgb(53, 162, 235)"
      }, {
        label: 'mintemp_f',
        data: responseRep1['forecast'].map(x => x['stats']['day']['mintemp_f']),
        borderColor: "rgb(153, 62, 35)"
      }]
    });
  }

  useEffect(() => {
    fetch("/api/cities")
      .then((response) => response.json())
      .then((cities) => {
        setCities(cities);
        setOptions(cities);
        if (cities.length > 0) {
          setSelectedOption(cities[0]);
        }
      });
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Weather Monitoring App</title>
        <meta name="description" content="Weather Monitoring App" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <div style={{ width: 100 + '%' }}>
          <DatePicker selected={startDate} onChange={(date: Date) => setStartDate(date)} /></div>

        <div style={{ width: 100 + '%' }}>
          <Select
            defaultValue={selectedOption}
            onChange={setSelectedOption}
            options={options}
          /></div>

        <p>
          <AwesomeButton
            cssModule={AwesomeButtonStyles}
            type="primary"
            onPress={async () => {
              try {
                const post = bent(appUrl, 'POST', 'json', 200);

                // fetch request from weatherapi, req not triggered
                // for dates stored in C*
                const response = post('api/fetcher', { city: selectedOption.value, numDays: 10, forecastDate: startDate });

                // plot the chart for report1
                const responseRep1 = await post('api/report1', { city: selectedOption.value, date: startDate })
                plotReport1(responseRep1)

              } catch (err) {
                console.log(err)
              }
            }}>
            Weekly Temperature Report
          </AwesomeButton></p>

        <Line options={chartOptions} data={chartData} />
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  )
}
