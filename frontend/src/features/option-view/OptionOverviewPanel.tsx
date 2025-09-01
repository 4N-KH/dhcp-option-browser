import React, { useReducer } from "react";
import { OptionCodeOverviewDto } from "@/types/dto/option-code-overview.dto";
import { OptionValueOverviewDto } from "@/types/dto/option-value-overview.dto";
import { OptionOccurrenceDto } from "@/types/dto/option-occurrence.dto";
import { AnimatePresence, motion } from "framer-motion";

// Theme configuration for styling
const THEME = {
  borderRadius: {
    panel: "2.5rem",
    item: "0.75rem",
  },
  color: {
    bgPanel: "bg-gradient-to-br from-blue-950 via-blue-900/80 to-blue-800/60",
    borderPanel: "border border-blue-900/50",
    sectionLeft: "bg-gradient-to-b from-blue-950/85 via-blue-900/60 to-blue-800/50",
    sectionRight: "bg-gradient-to-b from-blue-950/60 via-blue-900/40 to-blue-800/10",
    treeItem: {
      base: "transition-colors",
      hover: "hover:bg-blue-900/40",
      selected: "bg-blue-900/80 text-white",
    },
    shimmer: "bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900/80",
  },
  shadow: {
    panel: "0 8px 32px 0 rgba(37,65,183,0.13)",
    selected: "inset 0 0 0 2px #60a5fa",
    focus: "inset 0 0 0 3px #7dd3fc",
  },
};

const t = (s: string) => s;

// Loading shimmer placeholder
const Shimmer: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div aria-busy="true" aria-live="polite" className="space-y-3 p-10 flex flex-col h-[340px] justify-center">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className={`rounded-xl h-7 w-full animate-pulse ${THEME.color.shimmer}`}
        style={{ backgroundSize: "200% 100%", backgroundRepeat: "no-repeat" }}
      />
    ))}
  </div>
);

// State and reducer for managing selected option and value
type State = {
  openOption: string | null;
  selectedValue: string | null;
};
type Action =
  | { type: "TOGGLE_OPEN"; optionCode: string }
  | { type: "SELECT_VALUE"; value: string }
  | { type: "RESET" };
const initialState: State = { openOption: null, selectedValue: null };
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "TOGGLE_OPEN":
      return { openOption: state.openOption === action.optionCode ? null : action.optionCode, selectedValue: null };
    case "SELECT_VALUE":
      return { ...state, selectedValue: action.value };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// Props for the main panel
type Props = {
  options: OptionCodeOverviewDto[] | null;
  loading?: boolean;
  error?: string | null;
  fetchValues: (option: OptionCodeOverviewDto) => Promise<OptionValueOverviewDto[]>;
  fetchOccurrences: (option: OptionCodeOverviewDto, value: string) => Promise<OptionOccurrenceDto[]>;
};

// Unique key for an option (code + name)
const getOptionKey = (opt: OptionCodeOverviewDto) => `${opt.code}:${opt.name}`;

const OptionOverviewPanel: React.FC<Props> = ({
  options,
  loading,
  error,
  fetchValues,
  fetchOccurrences,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [values, setValues] = React.useState<OptionValueOverviewDto[] | null>(null);
  const [occurrences, setOccurrences] = React.useState<OptionOccurrenceDto[] | null>(null);
  const [loadingValues, setLoadingValues] = React.useState(false);
  const [loadingOccurrences, setLoadingOccurrences] = React.useState(false);

  // Load values when an option is expanded
  React.useEffect(() => {
    if (state.openOption) {
      setLoadingValues(true);
      setValues(null);
      setOccurrences(null);
      const opt = options?.find((o) => getOptionKey(o) === state.openOption);
      if (opt) {
        fetchValues(opt)
          .then(setValues)
          .catch(() => setValues([]))
          .finally(() => setLoadingValues(false));
      }
    } else {
      setValues(null);
      setOccurrences(null);
      setLoadingValues(false);
    }
  }, [state.openOption, fetchValues, options]);

  // Load occurrences when a value is selected
  React.useEffect(() => {
    if (state.openOption && state.selectedValue) {
      setLoadingOccurrences(true);
      setOccurrences(null);
      const opt = options?.find((o) => getOptionKey(o) === state.openOption);
      if (opt) {
        fetchOccurrences(opt, state.selectedValue)
          .then(setOccurrences)
          .catch(() => setOccurrences([]))
          .finally(() => setLoadingOccurrences(false));
      }
    } else {
      setOccurrences(null);
      setLoadingOccurrences(false);
    }
  }, [state.openOption, state.selectedValue, fetchOccurrences, options]);

  // Empty/Loading/Error handling
  if (loading) return <Shimmer count={6} />;
  if (error)
    return (
      <div className="p-10 text-2xl text-red-400 font-semibold flex items-center justify-center h-[340px]" role="alert">
        {t("Error")}: {error}
      </div>
    );
  if (!options || options.length === 0)
    return (
      <div className="p-10 text-2xl text-blue-100 font-semibold flex items-center justify-center h-[340px]">
        {t("No DHCP options found.")}
      </div>
    );

  // Main layout
  return (
    <div
      className={`flex ${THEME.color.bgPanel} ${THEME.color.borderPanel} rounded-[${THEME.borderRadius.panel}] shadow-2xl overflow-hidden focus:outline-none`}
      style={{
        minHeight: 480,
        maxHeight: 760,
        height: 540,
        boxShadow: THEME.shadow.panel,
        borderRadius: THEME.borderRadius.panel,
      }}
      aria-label={t("DHCP Option Overview Panel")}
      tabIndex={0}
    >
      {/* Left: Option List */}
      <section className={`w-1/2 min-w-[280px] max-w-[500px] border-r border-blue-900/50 p-5 h-full flex flex-col ${THEME.color.sectionLeft}`}>
        <h2 className="font-semibold text-blue-50 mb-4 text-xl tracking-wide select-none" tabIndex={0}>
          {t("DHCP Options")}
        </h2>
        <ul className="divide-y divide-blue-900 overflow-y-auto">
          {options.map((opt) => {
            const optionKey = getOptionKey(opt);
            return (
              <li key={optionKey}>
                <div
                  className={`flex items-center justify-between cursor-pointer px-3 py-3 rounded-lg transition font-medium
                    ${state.openOption === optionKey ? "bg-blue-900/60 text-white" : "hover:bg-blue-900/30 text-blue-100"}`}
                  onClick={() => dispatch({ type: "TOGGLE_OPEN", optionCode: optionKey })}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") dispatch({ type: "TOGGLE_OPEN", optionCode: optionKey });
                  }}
                >
                  <span className="font-mono text-base">{opt.code}</span>
                  <span className="ml-3">{opt.name}</span>
                  <span className="ml-auto flex items-center">
                    <motion.svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      animate={{ rotate: state.openOption === optionKey ? 90 : 0 }}
                      transition={{ duration: 0.13, type: "spring", stiffness: 420, damping: 35 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </motion.svg>
                  </span>
                </div>
                <AnimatePresence initial={false}>
                  {state.openOption === optionKey && (
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.13, ease: "easeOut" }}
                      className="pl-7"
                    >
                      {loadingValues && <Shimmer count={3} />}
                      {!loadingValues &&
                        values &&
                        values.map((val) => {
                          const valueKey = `${optionKey}:${val.value ?? "null"}`;
                          return (
                            <li
                              key={valueKey}
                              className={`px-4 py-3 rounded-lg cursor-pointer font-mono transition
                                ${
                                  state.selectedValue === val.value
                                    ? "bg-blue-800/90 text-white"
                                    : "hover:bg-blue-800/40 text-blue-200"
                                }`}
                              onClick={() => dispatch({ type: "SELECT_VALUE", value: val.value ?? "" })}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") dispatch({ type: "SELECT_VALUE", value: val.value ?? "" });
                              }}
                            >
                              {val.value ?? <span className="italic text-blue-300">null</span>}
                              <span className="ml-3 text-xs text-blue-200">
                                {val.count} Object{val.count !== 1 && "s"}
                              </span>
                            </li>
                          );
                        })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Right: Objects Table */}
      <section className={`flex-1 min-w-[300px] p-5 h-full flex flex-col ${THEME.color.sectionRight}`}>
        <h2 className="font-semibold text-blue-50 mb-4 text-xl tracking-wide select-none" tabIndex={0}>
          {t("On which objects is this option set?")}
        </h2>
        <div className="flex-1 min-h-0">
          <ObjectsTable loading={loadingOccurrences} occurrences={occurrences ?? []} />
        </div>
      </section>
    </div>
  );
};

// Table of objects where selected option/value occurs
const ObjectsTable: React.FC<{
  loading: boolean;
  occurrences: OptionOccurrenceDto[];
}> = ({ loading, occurrences }) => (
  <div className="overflow-auto h-full custom-scrollbar" tabIndex={0} aria-label={t("Objects Table")}>
    {loading ? (
      <Shimmer count={4} />
    ) : (
      <table className="w-full border border-blue-900 text-base rounded-2xl overflow-hidden bg-gradient-to-tr from-blue-950/70 via-blue-900/40 to-blue-800/10 backdrop-blur">
        <thead>
          <tr className="bg-blue-950/90 text-blue-100 sticky top-0 z-10">
            <th className="p-3 text-left font-bold tracking-wide">{t("Type")}</th>
            <th className="p-3 text-left font-bold tracking-wide">{t("Name")}</th>
            <th className="p-3 text-left font-bold tracking-wide">{t("Address")}</th>
            <th className="p-3 text-left font-bold tracking-wide">{t("CIDR/Range")}</th>
            <th className="p-3 text-left font-bold tracking-wide">{t("Value")}</th>
            <th className="p-3 text-left font-bold tracking-wide">{t("Source")}</th>
            <th className="p-3 text-left font-bold tracking-wide">{t("Option Type")}</th>
          </tr>
        </thead>
        <tbody>
          {occurrences.length === 0 && (
            <tr>
              <td colSpan={7} className="text-blue-300 p-10 text-center text-lg font-semibold tracking-wider">
                {t("No objects for this selection.")}
              </td>
            </tr>
          )}
          {occurrences.map((occ, idx) => (
            <tr
              key={occ.objectId ? `${occ.objectType}:${occ.objectId}` : `${occ.objectType}:${idx}`}
              className={idx % 2 === 0 ? "bg-blue-950/30" : ""}
            >
              <td className="p-3 font-mono">{occ.objectType}</td>
              <td className="p-3">{occ.objectLabel}</td>
              <td className="p-3 font-mono">{occ.address ?? <span className="text-blue-300">–</span>}</td>
              <td className="p-3 font-mono">{occ.cidr ?? <span className="text-blue-300">–</span>}</td>
              <td className="p-3 font-mono">{occ.value ?? <span className="text-blue-300">–</span>}</td>
              <td className="p-3">{occ.source ?? <span className="text-blue-300">–</span>}</td>
              <td className="p-3">{occ.type ?? <span className="text-blue-300">–</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export default OptionOverviewPanel;
