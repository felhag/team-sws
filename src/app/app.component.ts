import data from "../data.json";
import { AfterViewInit, Component } from '@angular/core';
import { HighchartsChartModule } from 'highcharts-angular';

import Highcharts from 'highcharts';
import more from 'highcharts/highcharts-more';
import lollipop from 'highcharts/modules/lollipop';
import dumbbell from 'highcharts/modules/dumbbell';
import * as Dashboards from '@highcharts/dashboards';
import * as DataGrid from '@highcharts/dashboards/datagrid';
import LayoutModule from '@highcharts/dashboards/modules/layout';

more(Highcharts);
dumbbell(Highcharts);
lollipop(Highcharts);

Dashboards.HighchartsPlugin.custom.connectHighcharts(Highcharts);
Dashboards.DataGridPlugin.custom.connectDataGrid(DataGrid);
Dashboards.PluginHandler.addPlugin(Dashboards.HighchartsPlugin);
Dashboards.PluginHandler.addPlugin(Dashboards.DataGridPlugin);
LayoutModule(Dashboards);

@Component({
    selector: 'app-root',
    imports: [HighchartsChartModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
  private readonly data: [string, string][];
  private readonly dataDate: [Date, string][];
  private readonly names: string[];
  byDay: { [p: string]: string[] };
  successful: Date[];

  Highcharts: typeof Highcharts = Highcharts;
  byDayChart: Highcharts.Options;
  byYearChart: Highcharts.Options;
  byPersonChart: Highcharts.Options;
  timelineChart: Highcharts.Options;

  constructor() {
    this.data = data as [string, string][];
    this.dataDate = data.filter((item, pos) => data.findIndex(a => a[0] === item[0] && a[1] === item[1]) === pos).map(([date, name]) => [this.parseDate(date), name]);
    this.names = [...new Set(data.map(d => d[1]))];
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

  ngAfterViewInit() {
    setTimeout( () => this.streaks() );
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
    const almost: [string, string][] = Object.entries(this.byDay).filter(entry => new Set(entry[1]).size === 4).map(e => [e[0], this.names.find(n => !e[1].includes(n)) as string]);
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
        data: this.groupByAsData(this.dataDate.map(u => u[1]))
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
        text: 'Per jaar'
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
    return {
      title: {
        text: 'Timeline'
      },
      xAxis: {
        type: 'datetime',
        title: {text: null},
        min: new Date(2021, 0, 1).getTime(),
        max: new Date().getTime()
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
      plotOptions: {
        series: {
          cumulative: true,
        }
      },
      series: [{
        type: 'lollipop',
        data: this.successful.map(e => [e.getTime(), 5]),
        marker: { radius: 5, enabled: true }
      }, {
        type: 'line',
        data: this.data.map(d => [this.parseDate(d[0]).getTime(), 1]).reduce((acc) => [acc[0], acc[1] + 1], [new Date().getTime(), 0]),
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

  private streaks() {
    const streaks: [string, Date[]][] = [];
    this.names.forEach(n => {
      this.dataDate.filter(dd => dd[1] === n).reduce((prev, cur) => {
        if (!prev.length || cur[0].getTime() - prev[prev.length - 1].getTime() <= 25 * 60 * 60 * 1000) {
          return [...prev, cur[0]];
        } else {
          if (prev.length > 1) {
            streaks.push([n, prev]);
          }
          return [cur[0]];
        }
      }, [] as Date[]);
    });

    Dashboards.board('dashboard', {
      dataPool: {
        connectors: [{
          id: 'data',
          type: 'JSON',
          options: {
            firstRowAsNames: false,
            columnNames: ['Naam','Dagen','Van','Tot'],
            data: streaks
              .sort((a, b) => b[1].length - a[1].length)
              .slice(0, 10)
              .map(([name, dates], idx) => [
                this.medal(idx) + name,
                dates.length + ' dagen',
                dates[0].toLocaleDateString(),
                dates.pop()!.toLocaleDateString()
              ])
          },
        }]
      },
      gui: {
        layouts: [{
          id: 'layout-1',
          rows: [{
            cells: [
              { id: 'dashboard-col-1' },
              { id: 'dashboard-col-2' }
            ]
          }]
        }]
      },
      components: [{
        title: 'Succes',
        renderTo: 'dashboard-col-1',
        type: 'KPI',
        value: '🏆 ' + this.successful.length
      }, {
        title: 'Streaks',
        renderTo: 'dashboard-col-2',
        connector: { id: 'data' },
        type: 'DataGrid',
        // dataGridOptions: { editable: false }
      }]
    });
  }

  private medal(idx: number) {
    switch (idx){
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🏅';
    }
  }
}
