# TouchPortal-Dynamic-Icons
Generate Dynamic Icons for Touch Portal based on Actions and 0-100% values.

- [TouchPortal-Dynamic-Icons](#touchportal-dynamic-icons)
- [Change Log](#change-log)
- [Actions](#actions)
  - [Simple Round Gauge](#simple-round-gauge)
  - [Simple Bar Graph](#simple-bar-graph)
- [Sample Generator Uses](#sample-generator-uses)
  - [Simple Round Gauge - Usage from Events tab](#simple-round-gauge---usage-from-events-tab)
  - [Simple Bar Graph - Usage from Events tab](#simple-bar-graph---usage-from-events-tab)
- [Sample Icon Uses](#sample-icon-uses)
- [Dependencies](#dependencies)
- [Versioning](#versioning)
- [Authors](#authors)
- [License](#license)
- [Bugs/Enhancements](#bugsenhancements)
- [Acknowledgements](#acknowledgements)

# Change Log
```
v1.0.0 - Initial Release
  Features:
    - Actions for Simple Round Gauge and Simple Bar Graph
```

# Actions

Available Actions are

![Action List](Resources/action-list.png)

## Simple Round Gauge

![Simple Round Gauge](Resources/SimpleRoundGauge-Action.png)

## Simple Bar Graph

![Simple Bar Graph](Resources/SimpleBarGraph-Action.png)


# Sample Generator Uses

## Simple Round Gauge - Usage from Events tab

Using the Touch Portal Open Hardware Monitor Plugin state, this will generate a Cyan colored radial gauge with no background and no shadow.

![Simple Round Gauge Sample](Resources/SimpleRoundGauge-Sample.png)

## Simple Bar Graph - Usage from Events tab

Using the Touch Portal Open Hardware Monitor Plugin state, this will generate a Blue colored bar graph with no background and each bar with have a width of 10px

![Simple Bar Graph Sample](Resources/SimpleBarGraph-Sample.png)

# Sample Icon Uses

In order to use the icons, they first have to have been started to be generated. So at least one action needs to fire that will tell the plugin to generate a new state with the name you have provided. Once that is done here is an example of how to use that icon to change the icon on the button you have.

![Simple Round Gauge Icon Sample](Resources/SimplRoundGauge-IconSample.png)

Here is an example of using 4 Simple Round guages on the same page, with 4 random values

![Simple Round Gauge 4 Icons](Resources/4-SimpleRoundGauges-Example.gif)

Here is how the actions were setup for the above 4 Simple Round gauges

![Simple Round Gauge 4 Icons Action](Resources/4-SimpleRoundGauges-Actoins-Example.gif)

# Dependencies

1. [skia-canvas](https://www.npmjs.com/package/skia-canvas)
2. [touchportal-api](https://www.npmjs.com/package/touchportal-api)

# Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the Releases section

# Authors

- **Jameson Allen** - _Initial work_ - [Spdermn02](https://github.com/spdermn02)

# License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

# Bugs/Enhancements
Use the Github Issues tab to report any bugs/enhancements for this plug-in. Or mention them in the Official Touch Portal discord channel #dynamic-icons

# Acknowledgements
1. Thank you to Reinier and Ty, the Touch Portal Creators