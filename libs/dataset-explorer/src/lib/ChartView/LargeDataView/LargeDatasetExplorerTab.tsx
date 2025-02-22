// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { IDropdownOption, Dropdown, Text, Stack } from "@fluentui/react";
import {
  ColumnCategories,
  cohortKey,
  ChartTypes,
  IGenericChartProps,
  ISelectorConfig,
  MissingParametersPlaceholder,
  defaultModelAssessmentContext,
  ModelAssessmentContext,
  TelemetryLevels,
  TelemetryEventName,
  OtherChartTypes,
  calculateBubblePlotDataFromErrorCohort,
  IHighchartsConfig,
  ifEnableLargeData,
  hasAxisTypeChanged,
  getScatterOption,
  instanceOfHighChart,
  IHighchartBubbleSDKClusterData
} from "@responsible-ai/core-ui";
import { localization } from "@responsible-ai/localization";
import _ from "lodash";
import React from "react";

import { SidePanel } from "../DataAnalysisView/SidePanel";
import { datasetExplorerTabStyles } from "../utils/DatasetExplorerTab.styles";
import { generateDefaultChartAxes } from "../utils/generateDefaultChartAxes";

import { getBarOrBoxChartConfig } from "./getBarOrBoxChartConfig";
import {
  getInitialState,
  IDatasetExplorerTabProps,
  IDatasetExplorerTabState
} from "./ILargeDatasetExplorerTabSpec";
import { LargeDatasetExplorerChartArea } from "./LargeDatasetExplorerChartArea";
import { getDefaultChart } from "./largeDatasetExplorerTabUtils";

export class LargeDatasetExplorerTab extends React.Component<
  IDatasetExplorerTabProps,
  IDatasetExplorerTabState
> {
  public static contextType = ModelAssessmentContext;
  public context: React.ContextType<typeof ModelAssessmentContext> =
    defaultModelAssessmentContext;
  private changedKeys: string[] = [];

  private readonly chartAndConfigsId = "LargeDatasetExplorerChart";

  public constructor(props: IDatasetExplorerTabProps) {
    super(props);

    this.state = getInitialState();
  }

  public componentDidMount(): void {
    const initialCohortIndex = 0;
    const chartProps = generateDefaultChartAxes(this.context.jointDataset);
    this.generateHighChartConfigOverride(initialCohortIndex, chartProps);
  }

  public componentDidUpdate(
    _preProp: IDatasetExplorerTabProps,
    preState: IDatasetExplorerTabState
  ): void {
    if (preState.selectedCohortIndex >= this.context.errorCohorts.length) {
      this.generateHighChartConfigOverride(0, this.state.chartProps);
      return;
    }
    if (
      this.state.isRevertButtonClicked &&
      preState.isRevertButtonClicked !== this.state.isRevertButtonClicked
    ) {
      this.generateHighChartConfigOverride(
        this.state.selectedCohortIndex,
        this.state.chartProps
      );
    }
  }

  public render(): React.ReactNode {
    const classNames = datasetExplorerTabStyles();

    if (!this.context.jointDataset.hasDataset) {
      return (
        <MissingParametersPlaceholder>
          {localization.Interpret.DatasetExplorer.missingParameters}
        </MissingParametersPlaceholder>
      );
    }

    if (
      this.state.highChartConfigOverride === undefined ||
      this.state.chartProps === undefined
    ) {
      return <div />;
    }

    const cohortOptions =
      this.state.chartProps.xAxis.property !== cohortKey
        ? this.context.errorCohorts.map((errorCohort, index) => {
            return { key: index, text: errorCohort.cohort.name };
          })
        : undefined;
    const yAxisCategories = [
      ColumnCategories.Index,
      ColumnCategories.Dataset,
      ColumnCategories.Outcome
    ];
    if (this.state.chartProps.chartType !== ChartTypes.Scatter) {
      yAxisCategories.push(ColumnCategories.None);
    }

    return (
      <Stack
        horizontal={false}
        grow
        tokens={{ childrenGap: "l1" }}
        className={classNames.page}
        id={this.chartAndConfigsId}
      >
        <Stack.Item className={classNames.infoWithText}>
          <Text variant="medium">
            {localization.Interpret.DatasetExplorer.helperText}
          </Text>
        </Stack.Item>
        <Stack.Item className={classNames.cohortPickerWrapper}>
          <Stack horizontal grow className={classNames.cohortPicker}>
            <Text variant="mediumPlus" className={classNames.cohortPickerLabel}>
              {localization.Interpret.ModelPerformance.cohortPickerLabel}
            </Text>
            {cohortOptions && (
              <Dropdown
                className={classNames.cohortDropdown}
                id="dataExplorerCohortDropdown"
                options={cohortOptions}
                selectedKey={this.state.selectedCohortIndex}
                onChange={this.setSelectedCohort}
                ariaLabel={
                  localization.Interpret.DatasetExplorer.datasetCohortDropdown
                }
                disabled={this.state.isBubbleChartDataLoading}
              />
            )}
          </Stack>
        </Stack.Item>
        <Stack.Item className={classNames.mainArea}>
          <Stack horizontal grow className={classNames.chartAndType}>
            <LargeDatasetExplorerChartArea
              chartProps={this.state.chartProps}
              selectedCohortIndex={this.state.selectedCohortIndex}
              isBubbleChartRendered={this.state.isBubbleChartRendered}
              highChartConfigOverride={this.state.highChartConfigOverride}
              isBubbleChartDataLoading={this.state.isBubbleChartDataLoading}
              bubbleChartErrorMessage={this.state.bubbleChartErrorMessage}
              onXSet={this.onXSet}
              onYSet={this.onYSet}
            />
            <Stack.Item className={classNames.sidePanel}>
              <SidePanel
                chartProps={this.state.chartProps}
                cohorts={this.context.errorCohorts.map(
                  (errorCohort) => errorCohort.cohort
                )}
                jointDataset={this.context.jointDataset}
                selectedCohortIndex={this.state.selectedCohortIndex}
                onChartPropChange={this.onChartPropsChange}
                dataset={this.context.dataset}
                disabled={this.state.isBubbleChartDataLoading}
                isBubbleChartRendered={this.state.isBubbleChartRendered}
                setIsRevertButtonClicked={this.setIsRevertButtonClicked}
              />
            </Stack.Item>
          </Stack>
        </Stack.Item>
      </Stack>
    );
  }

  private onChartPropsChange = (chartProps: IGenericChartProps): void => {
    this.generateHighChartConfigOverride(
      this.state.selectedCohortIndex,
      chartProps
    );
  };

  private setIsRevertButtonClicked = (status: boolean): void => {
    this.setState({
      indexSeries: [],
      isRevertButtonClicked: status,
      xSeries: [],
      ySeries: []
    });
  };

  private async generateHighChartConfigOverride(
    cohortIndex: number,
    chartProps: IGenericChartProps | undefined
  ): Promise<void> {
    if (chartProps) {
      if (
        !this.context.requestDatasetAnalysisBarChart ||
        !this.context.requestDatasetAnalysisBoxChart ||
        !chartProps?.xAxis.property ||
        !chartProps?.yAxis.property
      ) {
        const configOverride = getDefaultChart(
          this.context.errorCohorts.map((errorCohort) => errorCohort.cohort)[
            cohortIndex
          ],
          this.context.jointDataset,
          chartProps
        );

        this.setState({
          chartProps,
          highChartConfigOverride: configOverride,
          selectedCohortIndex: cohortIndex
        });
        return;
      }
      if (chartProps.chartType !== OtherChartTypes.Bubble) {
        const datasetBarConfigOverride = await getBarOrBoxChartConfig(
          this.context.errorCohorts[cohortIndex].cohort,
          this.context.jointDataset,
          chartProps?.xAxis.property,
          chartProps?.yAxis.property,
          this.context.requestDatasetAnalysisBarChart,
          this.context.requestDatasetAnalysisBoxChart
        );

        this.setState({
          chartProps,
          highChartConfigOverride: datasetBarConfigOverride,
          selectedCohortIndex: cohortIndex
        });
      } else {
        // at this point it is either a bubble chart or scatter chart for individual bubbles
        const hasAxisTypeChanged = this.hasAxisTypeChanged(chartProps);
        if (!hasAxisTypeChanged) {
          this.updateBubblePlotData(chartProps, cohortIndex);
        } else {
          this.updateScatterPlotData(chartProps, cohortIndex);
        }
      }
    } else {
      this.setState({
        chartProps,
        selectedCohortIndex: cohortIndex
      });
    }
  }

  private setSelectedCohort = (
    _: React.FormEvent<HTMLDivElement>,
    item?: IDropdownOption
  ): void => {
    if (!this.state.chartProps) {
      return;
    }

    if (item?.key !== undefined) {
      this.generateHighChartConfigOverride(
        item.key as number,
        this.state.chartProps
      );
      this.logButtonClick(TelemetryEventName.DatasetExplorerNewCohortSelected);
    }
  };

  private logButtonClick = (eventName: TelemetryEventName): void => {
    this.props.telemetryHook?.({
      level: TelemetryLevels.ButtonClick,
      type: eventName
    });
  };

  private updateBubblePlotData = async (
    chartProps: IGenericChartProps,
    cohortIndex: number
  ): Promise<void> => {
    this.setState({
      isBubbleChartDataLoading: true
    });
    const datasetBarConfigOverride = await this.getBubblePlotData(
      chartProps,
      cohortIndex
    );
    this.resetSeries(chartProps);
    if (
      datasetBarConfigOverride &&
      !instanceOfHighChart(datasetBarConfigOverride)
    ) {
      this.setErrorStatus(chartProps, cohortIndex, datasetBarConfigOverride);
      return;
    }
    this.setState({
      chartProps,
      highChartConfigOverride: datasetBarConfigOverride,
      isBubbleChartDataLoading: false,
      isBubbleChartRendered: true,
      isRevertButtonClicked: false,
      selectedCohortIndex: cohortIndex
    });
  };

  private updateScatterPlotData = (
    chartProps: IGenericChartProps,
    cohortIndex: number
  ): void => {
    const datasetBarConfigOverride = this.getScatterPlotData(chartProps);
    this.setState({
      chartProps,
      highChartConfigOverride: datasetBarConfigOverride,
      isBubbleChartRendered: false,
      isRevertButtonClicked: false,
      selectedCohortIndex: cohortIndex
    });
  };

  private getBubblePlotData = async (
    chartProps: IGenericChartProps,
    cohortIndex: number
  ): Promise<
    IHighchartBubbleSDKClusterData | IHighchartsConfig | undefined
  > => {
    return await calculateBubblePlotDataFromErrorCohort(
      this.context.errorCohorts[cohortIndex].cohort,
      chartProps,
      [],
      this.context.jointDataset,
      this.context.dataset,
      false,
      false,
      true,
      this.context.requestBubblePlotData,
      undefined,
      this.onBubbleClick,
      undefined
    );
  };

  private getScatterPlotData = (
    chartProps: IGenericChartProps
  ): IHighchartsConfig => {
    return getScatterOption(
      this.state.xSeries,
      this.state.ySeries,
      this.state.indexSeries,
      chartProps,
      this.context.jointDataset,
      [],
      [],
      false,
      false,
      true,
      undefined
    );
  };

  private setErrorStatus = (
    chartProps: IGenericChartProps,
    cohortIndex: number,
    datasetBarConfigOverride:
      | IHighchartBubbleSDKClusterData
      | IHighchartsConfig
      | undefined
  ): void => {
    if (datasetBarConfigOverride) {
      this.setState({
        bubbleChartErrorMessage: datasetBarConfigOverride
          .toString()
          .split(":")
          .pop(),
        chartProps,
        highChartConfigOverride: undefined,
        isBubbleChartDataLoading: false,
        selectedCohortIndex: cohortIndex
      });
    }
  };

  private onBubbleClick = (
    scatterPlotData: IHighchartsConfig,
    xSeries: number[],
    ySeries: number[],
    indexSeries: number[]
  ): void => {
    this.setState({
      highChartConfigOverride: scatterPlotData,
      indexSeries,
      isBubbleChartRendered: false,
      xSeries,
      ySeries
    });
  };

  private readonly hasAxisTypeChanged = (
    newChartProps: IGenericChartProps
  ): boolean => {
    if (this.state.chartProps) {
      this.changedKeys = [];
      this.compareChartProps(newChartProps, this.state.chartProps);
      return hasAxisTypeChanged(this.changedKeys);
    }
    return false;
  };

  private compareChartProps = (
    newProps: IGenericChartProps,
    oldProps: IGenericChartProps
  ): void => {
    for (const key in newProps) {
      if (typeof newProps[key] === "object") {
        this.compareChartProps(newProps[key], oldProps[key]);
      }
      if (newProps[key] !== oldProps[key]) {
        this.changedKeys.push(key);
      }
    }
  };

  private readonly resetSeries = (newProps: IGenericChartProps): void => {
    this.changedKeys = [];
    if (this.state.chartProps) {
      this.compareChartProps(newProps, this.state.chartProps);
      const shouldResetIndexes =
        ifEnableLargeData(this.context.dataset) &&
        !_.isEqual(this.state.chartProps, newProps) &&
        !hasAxisTypeChanged(this.changedKeys);
      if (shouldResetIndexes) {
        this.setState({
          indexSeries: [],
          isRevertButtonClicked: false,
          xSeries: [],
          ySeries: []
        });
      }
    }
  };

  private onXSet = (value: ISelectorConfig): void => {
    if (!this.state.chartProps) {
      return;
    }
    const newProps = _.cloneDeep(this.state.chartProps);
    newProps.xAxis = value;
    this.generateHighChartConfigOverride(
      this.state.selectedCohortIndex,
      newProps
    );
  };

  private onYSet = (value: ISelectorConfig): void => {
    if (!this.state.chartProps) {
      return;
    }
    const newProps = _.cloneDeep(this.state.chartProps);
    newProps.yAxis = value;
    this.generateHighChartConfigOverride(
      this.state.selectedCohortIndex,
      newProps
    );
  };
}
