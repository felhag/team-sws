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
Dashboards.GridPlugin.custom.connectGrid(DataGrid);
Dashboards.PluginHandler.addPlugin(Dashboards.HighchartsPlugin);
Dashboards.PluginHandler.addPlugin(Dashboards.GridPlugin);
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

  constructor() {
    this.data = data as [string, string][];
    this.dataDate = data.filter((item, pos) => data.findIndex(a => a[0] === item[0] && a[1] === item[1]) === pos).map(([date, name]) => [this.parseDate(date), name]);
    this.names = [...new Set(data.map(d => d[1]))];
    this.byDay = this.data.reduce(function (rv: { [key: string]: string[] }, x) {
      (rv[x[0]] = rv[x[0]] || []).push(x[1]);
      return rv;
    }, {});
    this.successful = Object.entries(this.byDay).filter(entry => new Set(entry[1]).size === 5).map(entry => this.parseDate(entry[0]));

    this.initHighcharts();
  }

  ngAfterViewInit() {
    setTimeout(() => this.streaks());
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

  private createByPerson(): Highcharts.Options {
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
          return this.point.series.type === 'line' ? `${this.y} puntjes` :
            new Date(parseInt(this.key as string)).toLocaleDateString()
        }
      },
      plotOptions: {
        series: {
          cumulative: true,
        }
      },
      series: [{
        type: 'lollipop',
        data: this.successful.map(e => [e.getTime(), this.data.length * .6]),
        marker: {radius: 5, enabled: true}
      }, {
        type: 'line',
        data: this.data.map((d, idx) => [this.parseDate(d[0]).getTime(), idx + 1]).sort((a, b) => a[0] - b[0])
      }]
    };
  }

  private initHighcharts() {
    const style = {style: {color: '#fff'}};
    Highcharts.setOptions({
      time: {
        timezone: 'Europe/Amsterdam'
      },
      chart: {
        backgroundColor: '#424242'
      },
      title: style,
      subtitle: style,
      legend: {itemStyle: {color: '#fff'}},
      xAxis: {
        title: style,
        labels: style
      },
      yAxis: {
        title: style,
        labels: style
      },
      plotOptions: {series: {borderColor: '#424242'}},
      navigation: {buttonOptions: {enabled: false}},
      accessibility: {enabled: false}
    });
  }

  private parseDate(date: string) {
    const split = date.split('/').map(d => parseInt(d));
    return new Date(split[2], split[1] - 1, split[0]);
  }

  private groupByAsData<T>(arr: T[], key?: (item: T) => any) {
    return Object.entries(arr.reduce<Record<string, T[]>>((prev, curr) => {
      const groupKey = key ? key(curr) : curr;
      const group = prev[groupKey] || [];
      group.push(curr);
      return {...prev, [groupKey]: group};
    }, {})).map(e => [e[0], e[1].length]);
  };

  private streaks() {
    const streaks: [string, Date[]][] = this.names.flatMap(n =>
      this.computeStreaks(this.dataDate.filter(dd => dd[1] === n).map(dd => dd[0]))
        .map(dates => [n, dates] as [string, Date[]])
    );

    const days = Math.round((this.dataDate[this.dataDate.length - 1][0].getTime() - this.dataDate[0][0].getTime()) / (24 * 60 * 60 * 1000));
    Dashboards.board('dashboard', {
      dataPool: {
        connectors: [{
          id: 'data',
          type: 'JSON',
          options: {
            firstRowAsNames: false,
            data: [
              ['Eerste punt', this.formatDate(this.dataDate[0][0])],
              ['Laatste punt', this.formatDate(this.dataDate[this.dataDate.length - 1][0])],
              ['Dagen', days],
              ['Dagen met punt', `${this.dataDate.length} (${Math.round(this.dataDate.length / days * 100)}%)`],
              ['Succes 🏆', `${this.successful.length} (${Math.round(this.successful.length / days * 100)}%)`],
              ['Eerste succes', this.formatDate(this.successful[0])],
              ['Laatste succes', this.formatDate(this.successful[this.successful.length - 1])],
            ]
          },
        }, {
          id: 'streaks',
          type: 'JSON',
          options: {
            firstRowAsNames: false,
            columnNames: ['Naam', 'Dagen', 'Van', 'Tot'],
            data: streaks
              .sort((a, b) => b[1].length - a[1].length)
              .slice(0, 10)
              .map(([name, dates], idx) => [
                this.medal(idx) + name,
                dates.length + ' dagen',
                this.formatDate(dates[0]),
                this.formatDate(dates.pop()!)
              ])
          },
        }, {
          id: 'successStreaks',
          type: 'JSON',
          options: {
            firstRowAsNames: false,
            columnNames: ['Dagen', 'Van', 'Tot'],
            data: this.computeStreaks(this.successful)
              .sort((a, b) => b.length - a.length)
              .slice(0, 10)
              .map((dates, idx) => [
                this.medal(idx) + dates.length + ' dagen',
                this.formatDate(dates[0]),
                this.formatDate(dates[dates.length - 1])
              ])
          },
        }]
      },
      gui: {
        layouts: [{
          rows: [{
            cells: [
              {id: 'dashboard-year'},
              {id: 'dashboard-day'},
              {id: 'dashboard-person'},
            ]
          },
            {
              cells: [
                {id: 'dashboard-timeline'}
              ]
            },

            {
              cells: [
                {id: 'dashboard-col-1'},
                {id: 'dashboard-col-2'},
                {id: 'dashboard-col-3'}
              ]
            }]
        }]
      },
      components: [{
        renderTo: 'dashboard-year',
        type: 'Highcharts',
        chartOptions: this.createByYear()
      }, {
        renderTo: 'dashboard-day',
        type: 'Highcharts',
        chartOptions: this.createByDay()
      }, {
        renderTo: 'dashboard-person',
        type: 'Highcharts',
        chartOptions: this.createByPerson()
      }, {
        renderTo: 'dashboard-timeline',
        type: 'Highcharts',
        chartOptions: this.createTimeline()
      }, {
        title: 'Stats',
        renderTo: 'dashboard-col-1',
        connector: {id: 'data'},
        type: 'DataGrid',
        gridOptions: {
          credits: {
            enabled: false
          }
        }
      }, {
        title: 'Streaks',
        renderTo: 'dashboard-col-2',
        connector: {id: 'streaks'},
        type: 'DataGrid',
        gridOptions: {
          credits: {
            enabled: false
          }
        }
      }, {
        title: 'Succes streaks',
        renderTo: 'dashboard-col-3',
        connector: {id: 'successStreaks'},
        type: 'DataGrid',
        gridOptions: {
          credits: {
            enabled: false
          }
        }
      }]
    });
  }

  private formatDate(date: Date) {
    return date.toLocaleDateString('nl-NL');
  }

  private computeStreaks(dates: Date[]): Date[][] {
    const streaks: Date[][] = [];
    let current: Date[] = [];
    for (const date of dates) {
      if (!current.length || date.getTime() - current[current.length - 1].getTime() <= 25 * 60 * 60 * 1000) {
        current.push(date);
      } else {
        if (current.length > 1) streaks.push(current);
        current = [date];
      }
    }
    if (current.length > 1) streaks.push(current);
    return streaks;
  }

  private medal(idx: number) {
    switch (idx) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return '🏅';
    }
  }
}
