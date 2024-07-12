import data from "../data.json";
import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';

import Highcharts from 'highcharts';
import more from 'highcharts/highcharts-more';
import lollipop from 'highcharts/modules/lollipop';
import dumbbell from 'highcharts/modules/dumbbell';
more(Highcharts);
dumbbell(Highcharts);
lollipop(Highcharts);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HighchartsChartModule, DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  data: [string, string][];
  byDay: { [p: string]: string[] };
  successful: Date[];

  Highcharts: typeof Highcharts = Highcharts;
  byDayChart: Highcharts.Options;
  byYearChart: Highcharts.Options;
  byPersonChart: Highcharts.Options;
  timelineChart: Highcharts.Options;

  constructor() {
    this.data = data as [string, string][];

    this.byDay = this.data.reduce(function(rv: {[key: string]: string[]}, x) {
      (rv[x[0]] = rv[x[0]] || []).push(x[1]);
      return rv;
    }, {});
    this.successful = Object.entries(this.byDay).filter(entry => new Set(entry[1]).size === 5).map(entry => this.parseDate(entry[0]));

    this.initHighcharts();
    this.byDayChart = this.createByDay();
    this.byPersonChart = this.createByPerson();
    this.byYearChart = this.createByYear();
    this.timelineChart = this.createTimeline();
  }

  private createByDay(): Highcharts.Options {
    return {
      chart: {
        type: 'pie'
      },
      title: {
        text: 'Per dag'
      },
      yAxis: {title: {text: null}},
      tooltip: {
        formatter: function () {
          return `<strong>${this.key}: </strong>${this.y}`;
        }
      },
      series: [{
        type: 'pie',
        showInLegend: false,
        data: this.groupByAsData(this.successful, date => date.toLocaleDateString('nl-NL', {weekday: 'long'}))
      }]
    };
  }

  private createByPerson<T>(): Highcharts.Options {
    const unique = data.filter((item, pos) => data.findIndex(a => a[0] === item[0] && a[1] === item[1]) === pos);
    const names = [...new Set(data.map(d => d[1]))];
    const almost: [string, string][] = Object.entries(this.byDay).filter(entry => new Set(entry[1]).size === 4).map(e => [e[0], names.find(n => !e[1].includes(n)) as string]);
    return {
      chart: {
        type: 'bar'
      },
      title: {
        text: 'Per persoon'
      },
      tooltip: {
        shared: true,
      },
      xAxis: {
        type: 'category',
      },
      yAxis: {title: {text: null}},
      series: [{
        type: 'bar',
        name: 'Berichten',
        data: this.groupByAsData(data.map(u => u[1]))
      }, {
        type: 'bar',
        name: 'Unieke berichten',
        data: this.groupByAsData(unique.map(u => u[1]))
      }, {
        type: 'bar',
        name: 'Verzaakt',
        data: this.groupByAsData(almost.map(u => u[1]))
      }]
    };
  }

  private createByYear(): Highcharts.Options {
    const years = [...new Set(this.successful.map(d => d.getFullYear()))];
    return {
      chart: {
        type: 'column',
      },
      title: {
        text: 'Succes 🥳'
      },
      xAxis: {
        categories: years.map(year => String(year))
      },
      yAxis: {title: {text: null}},
      plotOptions: {
        series: {
          stacking: 'normal'
        }
      },
      series: [...Array(12)].map((x, month) => ({
        type: 'column',
        name: Intl.DateTimeFormat('nl-NL', {month: 'long'}).format(new Date(String(month + 1))),
        data: years.map(year => this.successful.filter(date => date.getFullYear() === year && date.getMonth() === month).length)
      }))
    };
  }

  private createTimeline(): Highcharts.Options {
    const start = new Date(2021, 0, 1);
    const end = this.parseDate(data[data.length - 1][0]);
    return {
      chart: {
        width: document.body.clientWidth,
      },
      title: {
        text: 'Timeline'
      },
      xAxis: {
        type: 'datetime',
        title: {text: null},
        min: start.getTime(),
        max: end.getTime()
      },
      legend: {enabled: false},
      yAxis: {
        title: {text: null},
        visible: false
      },
      tooltip: {
        formatter: function () {
          return new Date(parseInt(this.key as string)).toLocaleDateString()
        }
      },
      series: [{
        type: 'lollipop',
        data: this.successful.map(e => [e.getTime(), 5]),
        marker: { radius: 5, enabled: true }
      }]
    };
  }

  private initHighcharts() {
    const style = { style: { color: '#fff'} };
    Highcharts.setOptions({
      time: {
        timezone: 'Europe/Amsterdam'
      },
      chart: {
        backgroundColor: '#424242'
      },
      title: style,
      subtitle: style,
      legend: { itemStyle: {color: '#fff'} },
      xAxis: {
        title: style,
        labels: style
      },
      yAxis: {
        title: style,
        labels: style
      },
      plotOptions: { series: { borderColor: '#424242' } },
      navigation: { buttonOptions: { enabled: false } },
      accessibility: { enabled: false }
    });
  }

  private parseDate(date: string) {
    const split = date.split('/').map(d => parseInt(d));
    return new Date(split[2], split[1] - 1, split[0]);
  }

  private groupByAsData <T>(arr: T[], key?: (item: T) => any) {
    return Object.entries(arr.reduce<Record<string, T[]>>((prev, curr) => {
      const groupKey = key ? key(curr) : curr;
      const group = prev[groupKey] || [];
      group.push(curr);
      return { ...prev, [groupKey]: group };
    }, {})).map(e => [e[0], e[1].length]);
  };
}
